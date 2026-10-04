FROM docker.n8n.io/n8nio/n8n:latest
USER root
COPY start.js /opt/smart-business-start.js
RUN chown node:node /opt/smart-business-start.js
USER node
CMD ["node", "/opt/smart-business-start.js"]
