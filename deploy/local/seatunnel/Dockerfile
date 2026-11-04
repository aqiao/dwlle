FROM eclipse-temurin:8u462-b08-jre

COPY artifacts/seatunnel-3.0.0 /opt/apache-seatunnel-3.0.0-bin.tar.gz
RUN cd /opt && \
    tar -xzf apache-seatunnel-3.0.0-bin.tar.gz && \
    mv apache-seatunnel-3.0.0 seatunnel && \
    rm apache-seatunnel-3.0.0-bin.tar.gz && \
    sed -i 's/#rootLogger.appenderRef.consoleStdout.ref/rootLogger.appenderRef.consoleStdout.ref/' seatunnel/config/log4j2.properties && \
    sed -i 's/#rootLogger.appenderRef.consoleStderr.ref/rootLogger.appenderRef.consoleStderr.ref/' seatunnel/config/log4j2.properties && \
    sed -i 's/rootLogger.appenderRef.file.ref/#rootLogger.appenderRef.file.ref/' seatunnel/config/log4j2.properties && \
    cp seatunnel/config/hazelcast-master.yaml seatunnel/config/hazelcast-worker.yaml

COPY artifacts/connector-jdbc-3.0.0.jar /opt/seatunnel/connectors/connector-jdbc-3.0.0.jar
COPY artifacts/connector-iceberg-3.0.0.jar /opt/seatunnel/connectors/connector-iceberg-3.0.0.jar
COPY artifacts/postgresql-jdbc-42.4.3.jar /opt/seatunnel/lib/postgresql-42.4.3.jar

WORKDIR /opt/seatunnel
