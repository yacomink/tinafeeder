FROM resin/raspberrypi-node

# install dependencies
RUN apt-get update && apt-get install -y bluetooth bluez libbluetooth-dev

# Enable systemd
ENV INITSYSTEM on

ADD . /usr/src/app

WORKDIR /usr/src/app

# install all npm (node.js) dependencies
RUN npm install express bean-sdk socket.io

# run start script when reaches device
CMD ["bash", "/usr/src/app/start.sh"]