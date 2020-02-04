console.log("Lambda Cloud - Mini v1.0");

async function lambda(groupID, nodeID, masterURI = "https://badillosoft.com") {
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
        node: {
            groupID,
            nodeID
        },
        async connectMaster() {
            if (this.socketMaster) this.socketMaster.disconnect();
            this.socketMaster = io(masterURI);
            await new Promise(resolve => {
                this.socketMaster.on("connect", () => {
                    console.log(`Lambda Cloud - Mini v1.0 (connect ${masterURI})`);
                    this.connectedMaster = true;
                    this.socketMaster.emit("node", this.node, async node => {
                        console.log(`Lambda Cloud - Mini v1.0 (signed ${node.groupToken.slice(24)})`);
                        this.node = node;
                        this.registeredMaster = true;
                        resolve();
                    });
                });
                this.socketMaster.on("disconnect", () => {
                    this.connectedMaster = false;
                    console.log("Lambda Cloud - Mini v1.0 (done)");
                });
                this.socketMaster.on("reset", async () => {
                    console.warn("Lambda Cloud - Mini v1.0 (reset)");
                    await this.connectHouse();
                });
            });
        },
        async to(nodeTo, code) {
            return await new Promise(resolve => {
                this.socketMaster.emit("peer", {
                    ...this.node,
                    protocol: {
                        type: "PEER"
                    },
                    code: JSON.stringify(code),
                }, { nodeID: nodeTo }, output => {
                    // console.log("peer success", output);
                    resolve(output);
                });
            });
        }
    };

    await instance.connectMaster();

    return instance;
}