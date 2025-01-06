FROM docker.1ms.run/library/node:23 AS builder

WORKDIR /workspace

RUN  npm install -g @vscode/vsce --registry=https://registry.npmmirror.com

COPY . .

RUN cd extension && vsce package

FROM scratch AS export-stage

COPY --from=builder /workspace/extension/*.vsix /_out/
