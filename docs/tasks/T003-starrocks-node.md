# T003 StarRocks 单节点：EC2、数据卷、安装与初始化

分支：`task/T003-starrocks-node` · 依赖：T001、T002 · 预计：8~12 小时（本阶段最重要的任务）

## 目标
用 `StarRocksStack` 一键部署单节点 StarRocks（FE 和 BE 同机，存算一体）。部署完成后，ETL、ad hoc、agent 三类账号和资源隔离都已经配置好，用户不需要做任何调优。

## 关键设计（必须遵守）

### D1. 数据卷与实例生命周期分离
- 数据卷用独立的 `ec2.Volume` 创建：gp3，加密，位于 `availabilityZones[0]`，容量、IOPS、吞吐量取自配置，`RemovalPolicy` 遵循配置。通过 `CfnVolumeAttachment` 挂载为 `/dev/sdf`。
- 实例被替换时，数据卷（包括 FE 元数据和 BE 数据）必须保留，并能挂到新实例上。
- 在 Nitro 实例上，数据卷会显示为 `nvme*n1`。**必须根据 EBS 卷 ID 找到对应设备**：`lsblk -o NAME,SERIAL` 输出的 SERIAL 等于去掉连字符的卷 ID，比如 `vol0abc...`。禁止假设设备名固定。
- 只在卷上没有文件系统时才格式化（xfs）。挂载到 `/data`，fstab 中使用 UUID 并加上 `nofail`。

### D2. 使用 FQDN 模式，保证替换后节点身份不变
- 创建 Route 53 私有托管区 `<envName>.dwller.internal`，关联到 VPC。添加 A 记录 `starrocks-0.<envName>.dwller.internal`，指向实例的私有 IP。
- 实例启动时设置自己的 hostname 为这个 FQDN。FE 以 `--host_type FQDN` 启动，BE 也用 FQDN 注册。
- 原因：实例替换后私有 IP 会变。如果 FE 元数据里记的是 IP，旧的 BE 就会失联。完整的替换演练放在 T004 验证。
- 把 SSM 参数 `/dwller/<env>/starrocks/endpoint` 的值设为 `<fqdn>:9030`。

### D3. 单节点必需的配置
- `fe.conf` 中设置 `default_replication_num = 1`。否则建表会因为副本数不足而失败。
- `priority_networks` 设为 VPC CIDR。
- 内存（启动时从 `/proc/meminfo` 计算）：
  - FE 堆内存：内存总量的 20%，最小 4G，最大 8G
  - BE `mem_limit`：70%
- Spill 目录：`/data/starrocks/spill`。
- 目录规划：
  - `/data/starrocks/fe/meta`
  - `/data/starrocks/be/storage`
  - `/data/starrocks/spill`
  - 安装目录 `/opt/starrocks-<version>`，用软链接 `/opt/starrocks` 指向它

### D4. 账号与资源隔离（数值是默认值，SQL 语法以所选版本的官方文档为准）

| 账号 | 用途 | 权限 | 资源组 | `query_timeout` |
|---|---|---|---|---|
| root | 仅用于初始化和运维 | 全部 | — | 默认 |
| `dwller_etl` | DolphinScheduler 任务 | `default_catalog` 下所有库的读写和建表权限 | `rg_etl` | 3600 |
| `dwller_adhoc` | IDE / Superset | `default_catalog` 下所有表的 SELECT | `rg_adhoc` | 300 |
| `dwller_agent_ro` | Agent 工具层 | 所有表的 SELECT | `rg_adhoc` | 60 |

资源组：
- `rg_etl`：`mem_limit` 50%，`concurrency_limit` 4，开启 spill
- `rg_adhoc`：
  - `mem_limit` 35%
  - `concurrency_limit` 10
  - 大查询熔断：CPU 时间 600 秒、扫描行数 10 亿、内存为 BE 内存上限的 25%
- 开启查询队列，适用于 SELECT 语句

注意：StarRocks 各版本的资源组参数名有变化（比如 `cpu_core_limit` 和 `cpu_weight`）。**请以 `versions.json` 中锁定版本的官方文档为准**，并在交付说明中列出最终采用的 SQL。

### D5. 密码
- CDK 为 root 和上述三个账号各创建一个 Secrets Manager secret：`dwller/<env>/starrocks/<user>`。值为 JSON：`{"username","password","host","port"}`。密码用 `generateSecretString` 生成，设置 `excludePunctuation: true`，避免 shell 和 SQL 转义问题。
- 实例运行时通过 AWS CLI 读取密码。密码不得出现在 user data、日志或 CloudFormation 参数中。

## 范围

### 1. `StarRocksStack`（`Dwller-<env>-StarRocks`）
props 接收 NetworkStack 的 `vpc`、`starRocksSg`，以及 StorageStack 的 artifacts、backup 两个 bucket。

- EC2 实例：
  - 位于私有子网，与数据卷同 AZ
  - 机型和架构取自配置
  - AMI 用 Amazon Linux 2023，通过 `MachineImage.latestAmazonLinux2023({ cpuType })` 获取
  - 强制 IMDSv2，不分配公网 IP，不配置密钥对
  - 根卷 30GiB，gp3，加密
- IAM 角色（最小权限）：
  - 托管策略 `AmazonSSMManagedInstanceCore`
  - artifacts bucket：只允许读取 `components/starrocks/*`
  - backup bucket：只允许读写 `starrocks/*`，并对该前缀做 ListBucket（T004 使用）
  - Secrets Manager：只允许读取上面 4 个 secret
- 自动恢复：为 `StatusCheckFailed_System` 创建 CloudWatch 告警，动作为 EC2 recover。ARN 必须对分区透明。
- 用 CDK Asset 上传 `infra/assets/starrocks/` 下的脚本和配置模板，user data 只负责拉取并执行入口脚本。
- **不要**开启 `userDataCausesReplacement`。

### 2. 安装与初始化脚本（`infra/assets/starrocks/`）
- `install.sh`：通过 user data 在每次启动时执行，必须幂等。步骤如下：
  1. 用 dnf 安装 `java-17-amazon-corretto-headless`、`mariadb105`、`xfsprogs`、`jq`
  2. 设置 hostname（D2）
  3. 识别、格式化并挂载数据卷（D1）
  4. 从 artifacts bucket 下载安装包，校验 sha256 后解压；该版本已经安装过则跳过
  5. 根据模板生成 `fe.conf` 和 `be.conf`（D3）
  6. 安装并启动 systemd 服务 `starrocks-fe`、`starrocks-be`
  7. 等待 FE 就绪（超时 300 秒）
  8. 如果 BE 还没有注册，用 FQDN 注册
  9. 执行 `bootstrap.sh`
- `bootstrap.sh`：初始化账号、权限、资源组和查询队列（D4、D5）。
  - 必须可以重复执行：已经存在的对象，要么跳过，要么 ALTER 成目标状态。
  - root 首次登录时密码为空，要先设置为 secret 中的值；之后一律用 secret 中的密码登录。
- 所有日志以 `[dwller]` 为前缀，同时输出到 `/var/log/dwller/` 和 journald。

### 3. 测试（`infra/test/starrocks.test.ts`）
需要断言：
- 实例没有公网 IP，且要求 IMDSv2
- 数据卷已加密；配置为 retain 时，`DeletionPolicy` 为 `Retain`
- IAM 策略中只有 SSM 托管策略含 `*` 资源；S3 资源限定在上面规定的前缀
- 有恰好 4 个 secret
- 存在 Route 53 私有托管区和 A 记录
- 两个分区 synth 后，模板里都没有 `arn:aws:`

## 不在范围内
- 每日备份和恢复（T004）
- CloudWatch Agent 日志采集
- 多节点部署
- 版本升级流程

## 验收标准
1. AGENTS.md §5 中的命令全部通过。
2. 在一个真实环境中部署成功（写明是 dev-global 还是 dev-cn），并完成以下验证：
   - 通过 SSM 端口转发连接 9030，用 `dwller_etl` 登录，建表并写入 1000 行数据
   - `SHOW BACKENDS` 显示 Alive=true，且 Host 为 FQDN
   - `SHOW RESOURCE GROUPS ALL` 能看到 `rg_etl` 和 `rg_adhoc`，参数与 D4 一致
   - `dwller_adhoc` 可以查询，但执行 `CREATE TABLE` 失败；`dwller_agent_ro` 同理
   - 重启实例后服务自动恢复，数据仍在
   - 手动再执行一次 `install.sh`，没有报错，状态也没有变化
3. 回答 ARCHITECTURE Q1：arm64 版本是否正常工作。如果有问题，附上现象描述，并改用 x86 配置完成验收。
4. 在交付说明里给出最终采用的资源组 SQL，以及 FE 和 BE 关键配置项的实际值。

## 给评审的关注点
- 数据卷识别和格式化逻辑，是否有误格式化已有数据的风险（**最高优先级**）
- 密码是否会在任何日志或 process list 中泄露，比如 `mysql -p<password>` 会把密码暴露在命令行参数里，应改用 `MYSQL_PWD` 环境变量或 defaults-file
- `bootstrap.sh` 是否真正幂等
- IAM 权限范围
