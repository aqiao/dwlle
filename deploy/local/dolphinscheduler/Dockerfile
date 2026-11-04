FROM eclipse-temurin:8u462-b08-jre

COPY artifacts/dolphinscheduler-3.4.3 /opt/apache-dolphinscheduler-3.4.3-bin.tar.gz
RUN cd /opt && \
    tar -xzf apache-dolphinscheduler-3.4.3-bin.tar.gz && \
    mv apache-dolphinscheduler-3.4.3-bin dolphinscheduler && \
    rm apache-dolphinscheduler-3.4.3-bin.tar.gz

ENV DOLPHINSCHEDULER_HOME=/opt/dolphinscheduler

WORKDIR /opt/dolphinscheduler

CMD ["/bin/bash", "/opt/dolphinscheduler/standalone-server/bin/start.sh"]
