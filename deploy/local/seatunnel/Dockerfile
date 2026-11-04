FROM eclipse-temurin:8u462-b08-jre

COPY artifacts/seatunnel-2.3.12 /opt/apache-seatunnel-2.3.12-bin.tar.gz
RUN cd /opt && \
    tar -xzf apache-seatunnel-2.3.12-bin.tar.gz && \
    mv apache-seatunnel-2.3.12 seatunnel && \
    rm apache-seatunnel-2.3.12-bin.tar.gz && \
    sed -i 's/#rootLogger.appenderRef.consoleStdout.ref/rootLogger.appenderRef.consoleStdout.ref/' seatunnel/config/log4j2.properties && \
    sed -i 's/#rootLogger.appenderRef.consoleStderr.ref/rootLogger.appenderRef.consoleStderr.ref/' seatunnel/config/log4j2.properties && \
    sed -i 's/rootLogger.appenderRef.file.ref/#rootLogger.appenderRef.file.ref/' seatunnel/config/log4j2.properties && \
    cp seatunnel/config/hazelcast-master.yaml seatunnel/config/hazelcast-worker.yaml

COPY artifacts/connector-jdbc-2.3.12.jar /opt/seatunnel/connectors/connector-jdbc-2.3.12.jar
COPY artifacts/connector-iceberg-2.3.12.jar /opt/seatunnel/connectors/connector-iceberg-2.3.12.jar
COPY artifacts/postgresql-jdbc-42.4.3.jar /opt/seatunnel/lib/postgresql-42.4.3.jar

WORKDIR /opt/seatunnel
