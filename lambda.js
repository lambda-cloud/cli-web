async function lambda(groupID, nodeID, masterURI = "http://localhost:4000") {
    if (!window.io) {
        async function installScript(url) {
            const script = document.createElement("script");
            await new Promise((resolve, reject) => {
                script.src = url;
                script.addEventListener("load", resolve);
                script.addEventListener("error", reject);
                document.body.append(script);
            });
        }
        await installScript("https://cdnjs.cloudflare.com/ajax/libs/node-uuid/1.4.8/uuid.js");
        await installScript("https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.js");
    }

    const instance = {
        socketMaster: null,
        socketHouse: null,
        connectedMaster: false,
        registeredMaster: false,
        connectedHouse: false,
        registeredHouse: false,
        house: {},
        node: {
            groupID,
            nodeID
        },
        async connectMaster() {
            if (this.socketMaster) this.socketMaster.disconnect();
            this.socketMaster = io(masterURI);
            await new Promise(resolve => {
                this.socketMaster.on("connect", () => {
                    // console.log("connected master");
                    this.connectedMaster = true;
                    this.socketMaster.emit("node", this.node, async house => {
                        // console.log("signed master");
                        this.house = house;
                        this.registeredMaster = true;
                        await this.connectHouse();
                        resolve();
                    });
                });
                this.socketMaster.on("disconnect", () => {
                    this.connectedMaster = false;
                    console.warn("disconnected master");
                });
                this.socketMaster.on("reset", async () => {
                    console.warn("reset house");
                    await this.connectHouse();
                });
            });
        },
        async connectHouse() {
            if (this.socketHouse) this.socketHouse.disconnect();
            
            this.socketHouse = io(this.house.houseURI);

            this.socketHouse.on("error", error => {
                // console.log(result);
                console.warn(error);
            });

            this.socketHouse.on("join", node => {
                // console.log("join", node);
            });

            this.socketHouse.on("node", node => {
                // console.log(`${node.nodeID.slice(0, 8)} [${node.protocol.type}]`);
            });

            this.socketHouse.on("disconnect", () => {
                console.warn(`disconnected house`);
            });

            await new Promise(resolve => {
                this.socketHouse.on("connect", () => {
                    // console.log("connected house");
                    this.socketHouse.emit("join", this.node, this.house, () => {
                        // console.log("signed house");
                        resolve();
                    });
                });
            });
        },
        async to(nodeTo, code) {
            return await new Promise(resolve => {
                this.socketHouse.emit("peer", {
                    ...this.node,
                    protocol: {
                        type: "PEER"
                    },
                    code: JSON.stringify(code),
                }, { nodeID: nodeTo }, this.house, output => {
                    // console.log("peer success", output);
                    resolve(output);
                });
            });
        }
    };

    await instance.connectMaster();

    return instance;
}