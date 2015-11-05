#!/bin/sh

VERSION=$1
if [ -z "$VERSION" ]; then VERSION='latest'; fi

docker stop proxy
docker rm proxy

#docker run -d -p 80:9000 --name proxy proxy:$VERSION;

PORT=80 npm start &

