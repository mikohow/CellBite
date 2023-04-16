p5.disableFriendlyErrors = true;

let Client = new Object();

setup = () => {
    /* Local Storage */
    getLocal = (target) => localStorage.getItem(target);
    setLocal = (target, value) => localStorage.setItem(target, value);

    /* Classes */
    class Component {
        constructor (properties, css) {
            this.properties = properties;
            this.parent = properties.parent || null;

            this.initiate(css);
        }

        appendChild (element) {
            this.element.appendChild(element);
        }

        initiate (css) {
            this.properties.tag = this.properties.tag || "div";
            this.element = document.createElement(this.properties.tag);

            this.element.id = this.properties.id || "";
            this.element.className = this.properties.class || "";

            if (css && this.properties.class) {
                const keys = Object.keys(css);
                const classes = this.properties.class.split(" ");

                this.properties.style = {...this.properties.style, ...css["*"]};

                for (let i = 0; i < classes.length; i++) {
                    const style = css[classes[i]];

                    if (style) {
                        this.properties.style = {...this.properties.style, ...style};
                    }
                }

            }

            if (typeof this.properties.attribute == "object") {
                const keys = Object.keys(this.properties.attribute);
                for (let i = 0; i < keys.length; i++) {
                    const attribute = this.properties.attribute;
                    this.element.setAttribute(keys[i], attribute[keys[i]]);
                }
            }

            if (typeof this.properties.style == "object") {
                const keys = Object.keys(this.properties.style);
                for (let i = 0; i < keys.length; i++) {
                    const style = this.properties.style;
                    this.element.style[keys[i]] = style[keys[i]];
                }
            }

            if (typeof this.properties.text == "string") {
                this.element.innerHTML = this.properties.text;
            }

            if (this.properties.children) {
                const children = Object.keys(this.properties.children);

                for (let i = 0; i < children.length; i++) {
                    this.properties.children[children[i]].component = new Component(this.properties.children[children[i]], css);
                    this.appendChild(this.properties.children[children[i]].component.element);
                }
            }
        }
    }

    class Connection {
        constructor (type, ipAddress) {
            this.ipAddress = ipAddress;
            this.socket = null;
            this.type = type;
    
            this.connect();
    
            if (this.type == "player") {
                setInterval(() => {
                    this.sendMouseMove();
                }, 25);
            }
        }
    
        connect () {
            if (this.socket) {
                this.socket.close();
            }

            this.type == "player" && Client.util.handleLeaderboard([]);
            this.type == "player" && $("#chat-box").html("");
    
            setTimeout(() => {
                this.socket = new WebSocket(this.ipAddress);
                this.socket.binaryType = "arraybuffer";
    
                this.socket.onopen = () => {
                    this.send(Buffer.from([254, 5, 0, 0, 0]));
                    this.send(Buffer.from([255, 0, 0, 0, 0]));
                    this.send(Buffer.from(new Uint8Array([254])));
    
                    switch (this.type) {
                        case "minion": {
                            setInterval(() => {
                                let prefix = Client.skin.minion == "::random" ? "{" + Client.skin.list[Math.floor(Date.now() % Client.skin.list.length)].name + "}" : Client.skin.minion;
                                let buffer = new Writer();
                                buffer.writeUInt8(0);
                                buffer.writeZeroUTF16String(prefix + $("#minion-nick").val());
    
                                this.send(buffer.getBuffer());
                            }, 1500);
    
                            setInterval(() => {
                                this.sendMouseMove();
                            }, 50);
                        } break;
                        case "player": {
                            this.getServerStats = setInterval(() => {
                                this.send(Buffer.from(new Uint8Array([254])));
                            }, 5e3);

                            this.sendMessage(`cb-player-${$("#nick").val()}`);
                        } break;
                    }
                };
    
                this.socket.onmessage = ({ data }) => {
                    const buffer = new Reader(data);
                    const packet = buffer.readUInt8();
    
                    switch (packet) {
                        case 16: {
                            if (this.type == "player") {
                            let E = buffer.readUInt16();
    
                            while (E--) {
                                const destroyer = buffer.readUInt32();
                                const destroyed = buffer.readUInt32();
                                const hasEntityDestroyer = Client.util.hasEntityId(destroyer);
                                const hasEntityDestroyed = Client.util.hasEntityId(destroyed);
                                const hasPlayerDestroyed = Client.util.hasPlayerId(destroyed);

                                if (hasEntityDestroyer && hasEntityDestroyed) {
                                    Client.util.getEntityById(destroyed).destroyer = Client.util.getEntityById(destroyer);
                                }

                                if (hasPlayerDestroyed) {
                                    Client.util.getPlayerById(destroyed).destroyer = Client.util.getEntityById(destroyer);
                                }
                            }
    
                            while (true) {
                                const id = buffer.readUInt32();
    
                                if (id === 0) break;
                                
                                let entity, hasIdentity = Client.util.hasEntityId(id), hasPlayerIdentity = Client.util.hasPlayerId(id);
    
                                if (hasIdentity) {
                                    entity = Client.util.getEntityById(id);
                                } else {
                                    entity = new Entity(id);
                                }
    
                                entity.id = id;
    
                                entity.newX = buffer.readInt32();
                                entity.newY = buffer.readInt32();
                                entity.newS = buffer.readInt16();
                                
                                if (!hasIdentity) {
                                    entity.oldX = entity.newX;
                                    entity.oldY = entity.newY;
                                    entity.oldS = entity.newS;
                                }
    
                                entity.color.r = buffer.readUInt8();
                                entity.color.g = buffer.readUInt8();
                                entity.color.b = buffer.readUInt8();
    
                                const rgb = `${entity.color.r}${entity.color.g}${entity.color.b}`;
                                const flags = buffer.readUInt8();

                                entity.flags = flags;
    
                                entity.type = "cell";
    
                                if (entity.newS <= 20) {
                                    entity.type = "pellet"
                                }
                      
                                if (flags & 1) {
                                    entity.type = "virus";
                                }
                      
                                if (flags & 2) {
                                    buffer.readUInt32();
                                }
                      
                                if (flags & 4) {
                                    entity.skin = buffer.readZeroUTF8String().substring(1);
                                }
    
                                if (flags & 32) {
                                    entity.type = "ejected";
                                }

                                if (entity.type == "cell" && !Client.cache.cell[`cell-${rgb}`]) {
                                    let size = 512;
                                    Client.cache.cell[`cell-${rgb}`] = createGraphics(size, size);
                                    Client.cache.cell[`cell-${rgb}`].background(0, 0, 0, 0);
                                    Client.cache.cell[`cell-${rgb}`].translate(size / 2, size / 2);
                                    Client.cache.cell[`cell-${rgb}`].fill(entity.color.r, entity.color.g, entity.color.b);
                                    Client.cache.cell[`cell-${rgb}`].noStroke();
                                    Client.cache.cell[`cell-${rgb}`].circle(0, 0, size);
                                } else if (entity.type == "pellet" && !Client.cache.pellet[`pellet-${rgb}`]) {
                                    Client.util.generatePelletGraphic(`pellet-${rgb}`, entity.color);
                                }
                      
                                const nick = buffer.readZeroUTF16String();
                      
                                if (nick) {
                                    let skin = Client.util.getSkinFromCurly(nick);

                                    if (skin.length) {
                                        entity.skin = skin[0];
                                    }
                                    
                                    entity.nick = nick == "An unnamed cell" ? "" : skin.length ? nick.replace(/{([^}]+)}/g, "") : nick;
    
                                    let clientNickCache = Client.cache.nick[Client.cache.nick.findIndex(index => index.id == entity.nick)];
    
                                    if (!clientNickCache) {
                                        Client.cache.nick.push({
                                            id: entity.nick,
                                            graphic: Client.util.generateNickGraphic(entity.nick)
                                        });
                                    }
                                }

                                if (entity.skin && Client.log.skinQueuedForDownload.indexOf(entity.skin) < 0) {
                                    Client.log.skinQueuedForDownload.push(entity.skin);

                                    if (Client.skin.list.findIndex(index => index.name == entity.skin) > - 1) {
                                        const index = Client.skin.list.findIndex(index => index.name == entity.skin);
                                        const url = Client.skin.list[index].url;
                                        const name = Client.skin.list[index].name;

                                        Client.util.generateSkinGraphic(url, name);
                                    }
                                }
    
                                if (!hasIdentity) {
                                    Client.entities.viewport.push(entity);
                                } else {
                                    let p = Client.util.getEntityById(id);
                                    if (document.hidden || (p.oldX == null && p.oldY == null && p.oldS == null)) {
                                        p.oldX = entity.newX;
                                        p.oldY = entity.newY;
                                        p.oldS = entity.newS;
                                    }
                                }
    
                                if (hasPlayerIdentity) {
                                    let playerEntity = Client.util.getPlayerById(id);
                                    playerEntity.nick = entity.nick;
                                    playerEntity.newX = entity.newX;
                                    playerEntity.newY = entity.newY;
                                    playerEntity.newS = entity.newS;
    
                                    if (playerEntity.oldS == null || playerEntity.oldY == null || playerEntity.oldS == null) {
                                        playerEntity.oldX = playerEntity.newX;
                                        playerEntity.oldY = playerEntity.newY;
                                        playerEntity.oldS = playerEntity.newS;
                                    }
                                }
                            }
    
                            const d = buffer.readUInt32();
    
                            for (let i = 0; i < d; i++) {
                                const id = buffer.readUInt32();
    
                                if (Client.util.hasEntityId(id) && !Client.util.getEntityById(id).destroyer) {
                                    Client.entities.viewport.splice(Client.entities.viewport.findIndex(index => index.id == id), 1);
                                }
    
                                if (this.type == "player" && Client.util.hasPlayerId(id) && !Client.util.getPlayerById(id).destroyer) {
                                    Client.entities.player.splice([Client.entities.player.findIndex(index => index.id == id)], 1);
                                }
    
                                if (!Client.entities.player.length && !$("#overlay-container").is(":visible") && Client.status == "active") {
                                    Client.toggleOverlayContainers();
    
                                    Client.status = "inactive";
                                }
                            }
                            }
                        } break;
                        case 17: {
                            // center camera with both players' cam data by array
                            //core.spectate = true;
                            if (this.type == "player") {
                                Client.camera.spectateX = buffer.readFloat();
                                Client.camera.spectateY = buffer.readFloat();
                                const b = buffer.readFloat();
                            }
                        } break;
                        case 20: {
                            if (this.type == "player") {
                                Client.entities.player = new Array();
                                Client.entities.viewport = new Array();
                            }
                        } break;
                        case 32: {
                            if (this.type == "player") {
                                const id = buffer.readUInt32();
                                Client.entities.player.push(new Entity(id));
    
                                Client.status = "active";
                            }
                        } break;
                        case 49: {
                            if (this.type == "player") {
                                const length = buffer.readUInt32();
                                let leaderboard = new Array();
    
                                for (let i = 0; i < length; i++) {
                                    const id = buffer.readUInt32();
                                    let nick = "";
    
                                    while (true) {
                                        const char = buffer.readUInt16();
    
                                        if (char === 0) break;
                                        nick += String.fromCharCode(char);
                                    }
    
                                    leaderboard.push({
                                        nick: nick,
                                        position: i + 1
                                    });
                                }
    
                                Client.util.handleLeaderboard(leaderboard);
                            }
                        } break;
                        case 64: {
                            if (this.type == "player") {
                                Client.map.minX = buffer.readDouble();
                                Client.map.minY = buffer.readDouble();
                                Client.map.maxX = buffer.readDouble();
                                Client.map.maxY = buffer.readDouble();
    
                                Client.map.size = Client.map.maxX + Client.map.maxY;
                            }
                        } break;
                        case 99: {
                            if (this.type == "player") {
                                const origin = buffer.readZeroUTF16String();
                                const message = buffer.readZeroUTF16String();
    
                                Client.checkMessageType(origin.replace(/[^\x00-\x7F]/g, ""), message);
                            }
                        } break;
                        case 254: {
                            if (this.type == "player") {
                                const server = JSON.parse(buffer.readZeroUTF8String());

                                $("#play-section-sub-title").text(server.mode);
                            }
                        } break;
                    }
                };
    
                this.socket.onerror = () => {
                    console.log(`${this.type} connection error`);
                };
    
                this.socket.onclose = () => {
                    console.log(`${this.type} connection closed`);
                };
            }, 10);
        }
    
        send (data) {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(data);
            }
        }

        sendMessage (message) {
            let buffer = new Writer();
            buffer.writeUInt8(0x63);
            buffer.writeUInt8(0);
            buffer.writeZeroUTF16String(message);
            this.send(buffer.getBuffer());
        }
    
        sendMouseMove () {
            if ((this.type == "player" || this.type == "minion") && $("#game-overlay-container").is(":visible") && this.socket) {
                let buffer = new Writer();
    
                buffer.writeUInt8(16);
                buffer.writeDouble((mouseX - width * 0.5) / Client.camera.oldS + Client.camera.oldX);
                buffer.writeDouble((mouseY - height * 0.5) / Client.camera.oldS + Client.camera.oldY);
                buffer.writeUInt32(0);
    
                this.send(buffer.getBuffer());
            }
        }
    }

    class Entity {
        constructor (id) {
            this.id = id;
            this.type = null;
            this.oldX = null;
            this.oldY = null;
            this.oldS = null;
            this.newX = null;
            this.newY = null;
            this.newS = null;
            this.nick = null;
            this.color = {
                r: 0,
                g: 0,
                b: 0
            };
        }
    }

    Client.renderer = {
        renderHTML: () => {
            const globalCSS = {
                "*": {
                    "text-align": "center",
                    "font-family": "'Ubuntu', sans-serif",
                    "outline": "none",
                    "user-select": "none"
                },
                "body": {
                    "background-color": "#f2fbff",
                    "margin": "0",
                    "padding": "0",
                    "overflow": "hidden"
                },
                "input": {
                    "height": "35px",
                    "color": "#353535",
                    "text-align": "left",
                    "background-color": "transparent",
                    "box-shadow": "inset 0 0 0 2px rgba(0, 0, 0, 0.25)",
                    "border": "none",
                    "border-radius": "5px",
                    "font-size": "16px",
                    "font-weight": "700",
                    "outline": "none",
                    "padding": "0 10px"
                },
                "select": {
                    "border": "none",
                    "outline": "none"
                },
                "ul": {
                    "list-style": "none",
                    "margin": "0",
                    "padding": "0"
                },
                "container": {
                    "position": "fixed"
                },
                "sub-container": {
                    "position": "absolute"
                },
                "full": {
                    "width": "100%",
                    "height": "100%"
                },
                "center": {
                    "top": "50%",
                    "left": "50%",
                    "transform": "translate(-50%, -50%)"
                },
                "fixed": {
                    "position": "fixed"
                },
                "absolute": {
                    "position": "absolute"
                },
                "relative": {
                    "position": "relative"
                },
                "pane-column": {
                    "display": "flex",
                    "flex-direction": "column",
                    "width": "300px",
                    "gap": "5px"
                },
                "pane-section": {
                    "width": "calc(100% - 50px)",
                    "background-color": "#fff",
                    "border-radius": "10px",
                    "padding": "25px"
                },
                "pane-section-row": {
                    "display": "flex",
                    "flex-direction": "row",
                    "width": "100%",
                    "height": "40px",
                    "justify-content": "center",
                    "align-items": "center",
                    "gap": "10px",
                    "margin": "0 0 15px 0"
                },
                "pane-section-title": {
                    "display": "block",
                    "width": "100%",
                    "color": "#353535",
                    "text-align": "center",
                    "font-size": "16px",
                    "font-weight": "700",
                    "margin": "0 0 10px 0"
                },
                "skin-preview": {
                    "width": "45px",
                    "height": "45px",
                    "backgroun-position": "cover",
                    "background-size": "cover",
                    "background-repeat": "no-repeat",
                    "box-shadow": "inset 0 0 0 2px rgba(0, 0, 0, 0.25)",
                    "border-radius": "50%",
                    "cursor": "pointer"
                },
                "skin-preview-alt": {
                    "top": "-4px",
                    "left": "-2px",
                    "width": "22px",
                    "height": "22px",
                    "line-height": "22px",
                    "color": "#FFF",
                    "text-align": "center",
                    "background": "#54C800",
                    "box-shadow": "inset 0 0 0 2.5px rgba(0, 0, 0, 0.15)",
                    "border-radius": "50%",
                    "font-size": "12px"
                },
                "btn": {
                    "color": "#fff",
                    "text-align": "center",
                    "border-radius": "5px",
                    "font-size": "20px",
                    "font-weight": "700",
                    "cursor": "pointer"
                },
                "btn-green": {
                    "background-color": "#54c800"
                },
                "btn-red": {
                    "background-color": "#f7000c"
                },
                "how-to": {
                    "color": "#353535",
                    "text-align": "center",
                    "font-size": "14px",
                    "opacity": "0.8"
                },
                "server-box": {
                    "width": "47%",
                    "height": "45px",
                    "text-align": "center",
                    "background": "rgba(100, 100, 100, 0.25)",
                    "border-radius": "3px",
                    "opacity": "0.75",
                    "cursor": "pointer"
                },
                "server-box-selected": {
                    "background": "transparent",
                    "box-shadow": "inset 0 0 0 3px rgba(0, 0, 0, 0.25)",
                    "opacity": "1"
                },
                "server-host": {
                    "top": "5px",
                    "left": "10px",
                    "color": "#353535",
                    "font-size": "18px",
                    "font-weight": "700"
                },
                "server-ip-address": {
                    "bottom": "5px",
                    "left": "10px",
                    "color": "#555",
                    "font-size": "10px"
                },
                "skin-search-item": {
                    "width": "75px",
                    "height": "75px",
                    "line-height": "75px",
                    "text-align": "center",
                    "background-size": "cover",
                    "background-position": "center",
                    "background-repeat": "no-repeat",
                    "box-shadow": "inset 0 0 0 2px rgba(0, 0, 0, 0.2)",
                    "border-radius": "50%",
                    "font-size": "50px",
                    "font-weight": "700",
                    "cursor": "pointer"
                }
            };

            let elements = {
                "overlay-container": {
                    id: "overlay-container",
                    class: "container full center",
                    parent: "body",
                    style: {
                        "background": "rgba(0, 0, 0, 0.75)",
                        "z-index": "50"
                    },
                    children: {
                        "pane-sub-container": {
                            id: "pane-sub-container",
                            class: "sub-container center",
                            style: {
                                "display": "flex",
                                "flex-direction": "row",
                                "gap": "5px"
                            },
                            children: {
                                "pane-column-left": {
                                    class: "pane-column",
                                    style: {},
                                    children: {
                                        "minion-section": {
                                            id: "minion-section",
                                            class: "pane-section",
                                            style: {},
                                            children: {
                                                "minion-section-title": {
                                                    class: "pane-section-title",
                                                    text: "Minions"
                                                },
                                                "minion-input-row": {
                                                    class: "pane-section-row",
                                                    children: {
                                                        "minion-skin-preview": {
                                                            id: "minion-skin-preview",
                                                            class: "skin-preview relative",
                                                            children: {
                                                                "minion-skin-preview-alt": {
                                                                    class: "skin-preview-alt absolute",
                                                                    text: "<i class='fa-solid fa-plus'></i>"
                                                                }
                                                            },
                                                            attribute: {
                                                                "toggle-for": "minion"
                                                            }
                                                        },
                                                        "minion-nick": {
                                                            tag: "input",
                                                            id: "minion-nick",
                                                            class: "input",
                                                            attribute: {
                                                                "type": "text",
                                                                "maxlength": "15",
                                                                "placeholder": getLocal("minion-nick") || "Minion Nick",
                                                                "spellcheck": "false"
                                                            },
                                                            style: {
                                                                "width": "62%"
                                                            }
                                                        }
                                                    }
                                                },
                                                "minion-amount-row": {
                                                    class: "pane-section-row relative",
                                                    children: {
                                                        "minion-amount-label": {
                                                            id: "minion-amount-label",
                                                            class: "absolute",
                                                            text: (getLocal("minion-amount") || "25") + " Bots",
                                                            style: {
                                                                "top": "0",
                                                                "left": "50%",
                                                                "transform": "translate(-50%, 0)",
                                                                "height": "20px",
                                                                "line-height": "20px",
                                                                "color": "#353535",
                                                                "box-shadow": "inset 0 0 0 2px rgba(0, 0, 0, 0.25)",
                                                                "border-radius": "3px",
                                                                "font-size": "12px",
                                                                "font-weight": "700",
                                                                "padding": "0 10px"
                                                            }
                                                        },
                                                        "minion-amount-slider": {
                                                            tag: "input",
                                                            id: "minion-amount-slider",
                                                            class: "absolute",
                                                            attribute: {
                                                                "type": "range",
                                                                "min": "5",
                                                                "max": "200",
                                                                "value": getLocal("minion-amount") || "25",
                                                                "step": "5"
                                                            },
                                                            style: {
                                                                "appearance": "none",
                                                                "bottom": "0",
                                                                "left": "50%",
                                                                "transform": "translate(-50%, 0)",
                                                                "width": "80%",
                                                                "height": "6px",
                                                                "background": "rgba(0, 0, 0, 0.1)",
                                                                "border-radius": "2px"
                                                            }
                                                        }
                                                    }
                                                },
                                                "toggle-minions": {
                                                    id: "toggle-minions",
                                                    class: "btn btn-green",
                                                    text: "Start",
                                                    style: {
                                                        "width": "100%",
                                                        "height": "35px",
                                                        "line-height": "35px",
                                                        "margin": "0 0 10px 0"
                                                    }
                                                },
                                                "how-to-control": {
                                                    id: "how-to-control",
                                                    class: "how-to",
                                                    children: {
                                                        "how-to-control-0": {
                                                            tag: "span",
                                                            text: "Press <strong>P</strong> to toggle follow / pause"
                                                        },
                                                        "minion-break-0": {
                                                            tag: "br"
                                                        },
                                                        "how-to-control-1": {
                                                            tag: "span",
                                                            text: "Press <strong>E</strong> to split minions"
                                                        },
                                                        "minion-break-1": {
                                                            tag: "br"
                                                        },
                                                        "how-to-control-2": {
                                                            tag: "span",
                                                            text: "Press <strong>R</strong> to eject closest minions"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                "pane-column-center": {
                                    class: "pane-column",
                                    children: {
                                        "play-section": {
                                            id: "play-section",
                                            class: "pane-section",
                                            style: {},
                                            children: {
                                                "play-section-title": {
                                                    id: "play-section-title",
                                                    class: "relative",
                                                    text: "CellBite",
                                                    children: {
                                                        "play-section-sub-title": {
                                                            id: "play-section-sub-title",
                                                            class: "relative",
                                                            text: "Connecting...",
                                                            style: {
                                                                "color": "#555",
                                                                "font-size": "12px",
                                                                "font-weight": "400"
                                                            }
                                                        }
                                                    },
                                                    style: {
                                                        "display": "block",
                                                        "color": "#353535",
                                                        "text-align": "center",
                                                        "font-size": "48px",
                                                        "font-weight": "700",
                                                        "margin": "0 auto 25px auto"
                                                    }
                                                },
                                                "player-input-row": {
                                                    class: "pane-section-row",
                                                    children: {
                                                        "player-skin-preview": {
                                                            id: "player-skin-preview",
                                                            class: "skin-preview relative",
                                                            children: {
                                                                "player-skin-preview-alt": {
                                                                    class: "skin-preview-alt absolute",
                                                                    text: "<i class='fa-solid fa-plus'></i>"
                                                                }
                                                            },
                                                            attribute: {
                                                                "toggle-for": "player"
                                                            }
                                                        },
                                                        "player-nick": {
                                                            tag: "input",
                                                            id: "nick",
                                                            class: "input",
                                                            attribute: {
                                                                "type": "text",
                                                                "maxlength": "15",
                                                                "placeholder": getLocal("nick") || "Nick",
                                                                "spellcheck": "false"
                                                            },
                                                            style: {
                                                                "width": "62%"
                                                            }
                                                        }
                                                    }
                                                },
                                                "play": {
                                                    id: "play",
                                                    class: "btn btn-green",
                                                    text: "Play",
                                                    style: {
                                                        "width": "100%",
                                                        "height": "35px",
                                                        "line-height": "35px",
                                                        "margin": "0 0 10px 0"
                                                    }
                                                },
                                                "how-to-play": {
                                                    id: "how-to-play",
                                                    class: "how-to",
                                                    children: {
                                                        "how-to-play-0": {
                                                            tag: "span",
                                                            text: "Move your mouse to control your cell"
                                                        },
                                                        "player-break-0": {
                                                            tag: "br"
                                                        },
                                                        "how-to-play-1": {
                                                            tag: "span",
                                                            text: "Press <strong>Space</strong> to split"
                                                        },
                                                        "play-break-1": {
                                                            tag: "br"
                                                        },
                                                        "how-to-play-2": {
                                                            tag: "span",
                                                            text: "Press <strong>W</strong> to eject some mass"
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        "settings-section": {
                                            id: "play-section",
                                            class: "pane-section",
                                            style: {},
                                            children: {
                                                "settings-section-title": {
                                                    class: "pane-section-title",
                                                    text: "Settings"
                                                },
                                                "settings-section-row": {
                                                    class: "pane-section-row",
                                                    children: {
                                                        "graphics-select": {
                                                            tag: "select",
                                                            id: "graphics",
                                                            class: "input",
                                                            style: {},
                                                            children: {
                                                                "graphics-option-0": {
                                                                    tag: "option",
                                                                    text: "Graphics: Retina",
                                                                    attribute: {
                                                                        "value": "retina"
                                                                    }
                                                                },
                                                                "graphics-option-1": {
                                                                    tag: "option",
                                                                    text: "Graphics: High",
                                                                    attribute: {
                                                                        "value": "high"
                                                                    }
                                                                },
                                                                "graphics-option-2": {
                                                                    tag: "option",
                                                                    text: "Graphics: Medium",
                                                                    attribute: {
                                                                        "value": "medium"
                                                                    }
                                                                },
                                                                "graphics-option-3": {
                                                                    tag: "option",
                                                                    text: "Graphics: Low",
                                                                    attribute: {
                                                                        "value": "low"
                                                                    }
                                                                },
                                                                "graphics-option-4": {
                                                                    tag: "option",
                                                                    text: "Graphics: Very Low",
                                                                    attribute: {
                                                                        "value": "very_low"
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    style: {}
                                },
                                "pane-column-right": {
                                    class: "pane-column",
                                    style: {},
                                    children: {
                                        "server-section": {
                                            id: "server-section",
                                            class: "pane-section",
                                            style: {},
                                            children: {
                                                "server-section-title": {
                                                    class: "pane-section-title",
                                                    text: "Servers"
                                                },
                                                "server-grid": {
                                                    id: "server-grid",
                                                    style: {
                                                        "display": "flex",
                                                        "flex-direction": "row",
                                                        "flex-wrap": "wrap",
                                                        "justify-content": "center",
                                                        "align-items": "center",
                                                        "gap": "15px"
                                                    },
                                                    children: {}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "skin-sub-container": {
                            id: "skin-sub-container",
                            class: "sub-container center",
                            style: {
                                "display": "none",
                                "width": "920px",
                                "height": "620px",
                                "background": "#FFF",
                                "border-radius": "10px",
                                "padding": "20px",
                                "z-index": "100"
                            },
                            children: {
                                "skin-search": {
                                    tag: "input",
                                    id: "skin-search",
                                    class: "input",
                                    attribute: {
                                        "type": "text",
                                        "maxlength": "50",
                                        "placeholder": "Search Skins",
                                        "spellcheck": "false"
                                    },
                                    style: {
                                        "display": "block",
                                        "width": "200px",
                                        "text-align": "center",
                                        "margin": "0 auto 20px auto"
                                    }
                                },
                                "skin-search-list": {
                                    id: "skin-search-list",
                                    style: {
                                        "display": "flex",
                                        "flex-direction": "row",
                                        "flex-wrap": "wrap",
                                        "justify-content": "center",
                                        "align-content": "flex-start",
                                        "width": "100%",
                                        "height": "calc(100% - 55px)",
                                        "gap": "20px",
                                        "overflow-x": "hidden",
                                        "overflow-y": "scroll"
                                    },
                                    children: {
                                        "skin-search-item": {
                                            class: "skin-search-item",
                                            text: "?",
                                            attribute: {
                                                "skin-tag": "::random"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "game-overlay-container": {
                    id: "game-overlay-container",
                    class: "container full center",
                    parent: "body",
                    style: {
                        "display": "none",
                        "z-index": "25"
                    },
                    children: {
                        "leaderboard-sub-container": {
                            id: "leaderboard-sub-container",
                            class: "sub-container",
                            style: {
                                "top": "20px",
                                "right": "20px",
                                "width": "375px",
                                "color": "#FFF",
                                "background": "rgba(0, 0, 0, 0.4)",
                                "padding": "20px 0"
                            },
                            children: {
                                "leaderboard-title": {
                                    id: "leaderboard-title",
                                    text: "Leaderboard",
                                    style: {
                                        "display": "block",
                                        "text-align": "center",
                                        "font-size": "45px",
                                        "font-weight": "700",
                                        "margin": "0 0 10px 0"
                                    }
                                },
                                "leaderboard-ul": {
                                    tag: "ul",
                                    id: "leaderboard-ul",
                                    class: "ul",
                                    style: {
                                        "display": "flex",
                                        "flex-direction": "column",
                                        "width": "calc(100% - 40px)",
                                        "gap": "5px",
                                        "font-size": "25px",
                                        "margin": "0 auto"
                                    }
                                }
                            }
                        },
                        "chat-sub-container": {
                            id: "chat-sub-container",
                            class: "sub-container",
                            style: {
                                "bottom": "20px",
                                "left": "20px",
                                "width": "350px"
                            },
                            children: {
                                "chat-shadow": {
                                    id: "chat-shadow",
                                    class: "absolute",
                                    style: {
                                        "bottom": "-50px",
                                        "left": "-50px",
                                        "width": "calc(100% + 100px)",
                                        "height": "calc(100% + 100px)",
                                        "background": "linear-gradient(to bottom, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.5))",
                                        "filter": "blur(50px)",
                                        "z-index": "-1"
                                    }
                                },
                                "chat-box": {
                                    id: "chat-box",
                                    style: {
                                        "display": "flex",
                                        "flex-direction": "row",
                                        "justify-content": "center",
                                        "flex-wrap": "wrap",
                                        "width": "300px",
                                        "max-height": "550px",
                                        "gap": "10px",
                                        "color": "#fff",
                                        "overflow-x": "auto",
                                        "overflow-y": "scroll",
                                        "margin": "0 0 20px 0"
                                    }
                                },
                                "chat-emoji-ul": {
                                    tag: "ul",
                                    id: "chat-emoji-ul",
                                    style: {
                                        "display": "flex",
                                        "width": "100%",
                                        "height": "35px",
                                        "gap": "5px",
                                        "white-space": "nowrap",
                                        "padding": "0",
                                        "margin": "0 0 20px 0"
                                    },
                                    children: {}
                                },
                                "chat-input": {
                                    id: "chat-input",
                                    style: {
                                        "display": "flex",
                                        "flex-direction": "row",
                                        "width": "100%",
                                        "height": "35px",
                                    },
                                    children: {
                                        "message-input": {
                                            tag: "input",
                                            id: "message-input",
                                            attribute: {
                                                "type": "text",
                                                "maxlength": "200",
                                                "placeholder": "Enter to chat",
                                                "spellcheck": "false"
                                            },
                                            style: {
                                                "width": "200px",
                                                "height": "100%",
                                                "color": "#fff",
                                                "background": "rgba(0, 0, 0, 0.25)",
                                                "box-shadow": "inset 0 0 0 2px rgba(0, 0, 0, 0.25)",
                                                "border": "none",
                                                "border-radius": "5px",
                                                "font-size": "14px",
                                                "font-family": "'Ubuntu', sans-serif",
                                                "font-weight": "700",
                                                "outline": "none",
                                                "padding": "0 10px"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "main-canvas-container": {
                    id: "main-canvas-container",
                    class: "container full center",
                    parent: "body",
                    style: {
                        "z-index": "0"
                    }
                }
            };

            const serverkeys = Object.keys(Client.servers);
            const serverbox = elements["overlay-container"].children["pane-sub-container"].children["pane-column-right"].children["server-section"].children["server-grid"].children;

            for (let i = 0; i < serverkeys.length; i++) {
                serverbox[`server-row-${i}`] = {
                    class: `server-box ${i == 0 ? "server-box-selected" : ""} relative`,
                        attribute: {
                            "ip-address": Client.servers[serverkeys[i]]
                        },
                        children: {
                            "ip-address": {
                                class: "server-ip-address absolute",
                                text: `<i class="fa-solid fa-lock-open" style="transform: translate(0, -1px);margin: 0 2.5px 0 0"></i> ${Client.servers[serverkeys[i]].replace(/wss?:\/\//g, "").replace(/:\d*/g, "").replace(/\/api\/?/g, "")}`
                            },
                            "host": {
                                class: "server-host absolute",
                                text: serverkeys[i]
                            }
                        }
                }
            }

            const emojiKeys = Object.keys(Client.emojis);
            const emojiListItem = elements["game-overlay-container"].children["chat-sub-container"].children["chat-emoji-ul"].children;

            for (let i = 0; i < emojiKeys.length; i++) {
                emojiListItem[`chat-emoji-li-${i}`] = {
                    class: "chat-emoji-li",
                    text: Client.emojis[`${i}`],
                    style: {
                        "width": "35px",
                        "height": "35px",
                        "line-height": "35px",
                        "text-align": "center",
                        "background": "rgba(0, 0, 0, 0.1)",
                        "border-radius": "5px",
                        "font-size": "22px"
                    }
                }
            }

            let bodyCSS = Object.keys(globalCSS["body"]);

            for (let i = 0; i < bodyCSS.length; i++) {
                document.body.style[bodyCSS[i]] = globalCSS["body"][bodyCSS[i]];
            }

            let keys = Object.keys(elements);

            for (let i = 0; i < keys.length; i++) {
                let element = elements[keys[i]];
                element.component = new Component(element, globalCSS);

                if (element.component.parent == "body") {
                    document.body.appendChild(element.component.element);
                }
            }
        }
    };

    /* Message Functions*/

    Client.checkMessageType = (origin, message) => {
        const isEmoji = message.match("cb-emoji-");
        const isJoinedNotification = message.match("cb-player-");
        const hasNumber = message.match(/\d+/g);

        isEmoji && hasNumber && Client.addCanvasEmoji(message);
        isJoinedNotification && Client.addJoinedNotification(message.split("cb-player-", 2).join(""));

        if (!isEmoji && !isJoinedNotification) {
            Client.addChatMessage(origin, message);
        }
    };

    Client.addChatMessage = (origin, message) => {
        const chatboxStyle = "position: relative; width: calc(100% - 30px); text-align: left; background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)); border-radius: 2px 15px 15px 15px; padding: 15px;";
        const senderStyle = "font-size: 18px; display: block;";
        const timestampStyle = "position: absolute; bottom: 15px; right: 15px; font-size: 12px; opacity: 0.5;";

        const messageData = `<span>${message}</span>`;
        const originData = `<div class="chat-sender" style="${senderStyle}"><strong>${origin}</strong></div>`;
        const timeData = `<div class="chat-timestamp" style="${timestampStyle}">${Client.util.getDate()}</div>`;

        if (message == Client.log.lastMessageSent) {
            $("#message-input").val("");
        }

        $("#chat-box").append(`<div class="chat-box" style="${chatboxStyle}">${originData}${messageData}${timeData}</div>`);
        $("#chat-box").animate({scrollTop: $("#chat-box").prop("scrollHeight")}, 250);
    };

    Client.addJoinedNotification = (nick) => {
        const chatboxStyle = "display: block; width: 100%;";

        $("#chat-box").append(`<div class="chat-box-joined relative"><strong>${nick || "An Unnamed Cell"}</strong> has joined</div>`);
        $("#chat-box").animate({scrollTop: $("#chat-box").prop("scrollHeight")}, 250);
    };

    Client.addCanvasEmoji = (message) => {
        const emoji = Number(message.match(/\d+/g)[0]) % $(".chat-emoji-li").length;

        Client.entities.emoji.push(new Entity(emoji));
    };

    Client.connect = (ipAddress) => {
        $("#play-section-sub-title").text("Connecting...");
        Client.minion.status == "active" && Client.toggleMinions();

        if (Client.connections.length) {
            for (let i = Client.connections.length - 1; i >= 0; i--) {
                Client.connections[i].socket.close();

                setTimeout(Client.connections.splice(i, 1), 100);
            }
        }

        Client.entities.viewport = new Array();
        Client.entities.player = new Array();

        setTimeout(() => {
            Client.connections.push(new Connection("player", ipAddress));
        }, 100);
    };

    Client.eject = (type) => {
        switch (type) {
            case "player": {
                if (Client.connections[Client.connections.findIndex(index => index.type == "player")]) {
                    Client.connections[Client.connections.findIndex(index => index.type == "player")].send(new Uint8Array([21]));
                }
            } break;
            case "minion": {
                for (let i = 0; i < Client.connections.length; i++) {
                    let connection = Client.connections[i];

                    if (connection.type == "minion") {
                        connection.send(new Uint8Array([21]));
                    }
                }
            } break;
        }
    };

    Client.loadMassGraphics = () => {
        for (let i = 0; i < 1501; i++) {
            Client.cache.mass.push(Client.util.generateMassGraphic(Math.floor((i * i) / 1e2)));
        }
    };

    Client.loadSkinLi = () => {
        for (let i = 0; i < Client.skin.list.length; i++) {
            const name = Client.skin.list[i].name;
            const url = Client.skin.list[i].url;

            const html = `<div class="skin-search-item" skin-tag="{${name}}" style="background-image: url(${url})"></div>`;

            $("#skin-search-list").append(html);
        }
    };

    Client.renderer.renderChatEmoji = () => {
        const canvas = Client.canvas.emoji;
        canvas.clear();

        for (let i = Client.entities.emoji.length - 1; i >= 0; i--) {
            let emoji = Client.entities.emoji[i];

            if (emoji.id === null) continue;

            const graphic = Client.cache.emoji[emoji.id];

            if (emoji.oldX == null || emoji.oldY == null || emoji.newX == null || emoji.newY == null) {
                emoji.amplitude = Math.floor(random(25, 45));
                emoji.period = Math.floor(random(60, 100));
                emoji.theta = Math.random() * Math.PI;
                emoji.clockwise = Math.random() < 0.5;

                emoji.newS = random(150, 300);
                emoji.newX = constrain(Math.random() * canvas.width, emoji.newS, canvas.width - emoji.newS);

                emoji.oldA = emoji.theta;
                emoji.oldX = emoji.newX;
                emoji.oldS = random(35, 55);

                emoji.newY = canvas.height + (emoji.oldS);
                emoji.oldY = emoji.newY;
            }

            emoji.newX = emoji.oldX - Math.sin(emoji.theta) * emoji.amplitude;
            emoji.newY -= 2;

            emoji.oldA += (emoji.theta - emoji.oldA) * (deltaTime / 3e3);
            emoji.oldX += (emoji.newX - emoji.oldX) * (deltaTime / 200);
            emoji.oldY += (emoji.newY - emoji.oldY) * (deltaTime / 200);
            emoji.oldS += (emoji.newS - emoji.oldS) * (deltaTime / 200);

            emoji.clockwise ? emoji.theta += 0.025 : emoji.theta -= 0.025;

            canvas.push();
            canvas.translate(emoji.oldX, emoji.oldY);
            canvas.rotate(emoji.oldA);
            canvas.image(graphic, 0, 0, emoji.oldS * 2, emoji.oldS * 2);

            canvas.pop();

            if (emoji.oldY + emoji.oldS < - canvas.height) {
                Client.entities.emoji.splice(i, 1);
            }
        }
    };

    Client.renderer.renderMapGrid = () => {
        const x = width / Client.camera.oldS;
        const y = height / Client.camera.oldS;
        const cameraX = - Client.camera.oldX;
        const cameraY = - Client.camera.oldY;

        push();
        stroke(0, 0, 0, 51);
        strokeWeight(1);
        scale(Client.camera.oldS);

        for (let i = - 0.5 + (cameraX + x / 2) % 50; i < x; i += 50) {
            line(i, 0, i, y);
        }

        push();

        for (let i = - 0.5 + (cameraY + y / 2) % 50; i < y; i += 50) {
            line(0, i, x, i);
        }
        pop();
        pop();
    };

    Client.renderer.renderMapPellet = (id, diameter) => {
        if (Client.cache.pellet[id]) {
            image(Client.cache.pellet[id], 0, 0, 25 + (diameter / 10), 25 + (diameter / 10));
        }
    };

    Client.renderer.renderMapVirus = (diameter) => {
        image(Client.cache.virus, 0, 0, diameter, diameter);
    };

    Client.renderer.setCameraView = () => {
        translate(width / 2, height / 2);
        scale(Client.camera.oldS);
        translate(- Client.camera.oldX, - Client.camera.oldY);
    };

    Client.renderer.setCameraViewUpdate = () => {
        Client.camera.oldX += (Client.camera.newX - Client.camera.oldX) * (deltaTime / 160);
        Client.camera.oldY += (Client.camera.newY - Client.camera.oldY) * (deltaTime / 160);
        Client.camera.oldS += ((!$("#game-overlay-container").is(":visible") ? Client.camera.idleS : Client.camera.newS) - Client.camera.oldS) * (deltaTime / 160);
    };

    Client.sendChatMessage = () => {
        if ($("#message-input").is(":focus") && $("#message-input").val().length && Client.connections[Client.connections.findIndex(index => index.type == "player")]) {
            Client.connections[Client.connections.findIndex(index => index.type == "player")].sendMessage($("#message-input").val());
            Client.log.lastMessageSent = $("#message-input").val();
        }
    };

    Client.sendEmojiMessage = (index) => {
        let buffer = new Writer();
        buffer.writeUInt8(0x63);
        buffer.writeUInt8(0);
        buffer.writeZeroUTF16String(`cb-emoji-${index}`);

        if (Client.connections[Client.connections.findIndex(index => index.type == "player")]) {
            Client.connections[Client.connections.findIndex(index => index.type == "player")].send(buffer.getBuffer());
        }
    }

    Client.setGraphics = (quality) => {
        switch (quality) {
            case "high": {
                Client.settings.graphicSize = 460;
                Client.settings.pixelDensity = 0.8;
            } break;
            case "medium": {
                Client.settings.graphicSize = 360;
                Client.settings.pixelDensity = 0.7;
            } break;
            case "low": {
                Client.settings.graphicSize = 256;
                Client.settings.pixelDensity = 0.6;
            } break;
            case "very_low": {
                Client.settings.graphicSize = 128;
                Client.settings.pixelDensity = 0.5;
            } break;
            default: {
                Client.settings.graphicSize = 512;
                Client.settings.pixelDensity = 1;
            } break;
        }

        Client.entities.reset();
        Client.loadMassGraphics();

        pixelDensity(Client.settings.pixelDensity);

        setLocal("pixel-density", Client.settings.pixelDensity);
        (quality == "retina" || quality == "high" || quality == "medium" || quality == "low" || quality == "very_low") && setLocal("quality", quality);
    }

    Client.spawn = () => {
        let buffer = new Writer();
        buffer.writeUInt8(0);
        buffer.writeZeroUTF16String(Client.skin.player + $("#nick").val());

        if (Client.connections[Client.connections.findIndex(index => index.type == "player")]) {
            Client.connections[Client.connections.findIndex(index => index.type == "player")].send(buffer.getBuffer());
        }
    };

    Client.split = (type) => {
        switch (type) {
            case "player": {
                if (Client.connections[Client.connections.findIndex(index => index.type == "player")]) {
                    Client.connections[Client.connections.findIndex(index => index.type == "player")].send(new Uint8Array([17]));
                }
            } break;
            case "minion": {
                for (let i = 0; i < Client.connections.length; i++) {
                    let connection = Client.connections[i];

                    if (connection.type == "minion") {
                        connection.send(new Uint8Array([17]));
                    }
                }
            } break;
        }
    };

    Client.toggleMinions = () => {
        Client.minion.status = Client.minion.status == "active" ? "inactive" : "active";

        switch (Client.minion.status) {
            case "active": {
                for (let i = 0; i < Client.minion.amount; i++) {
                    Client.connections.push(new Connection("minion", Client.settings.url));
                }

                $("#toggle-minions").css("background-color", "#f7000c").text("Stop");
            } break;
            case "inactive": {
                for (let i = Client.connections.length - 1; i >= 0; i--) {
                    let connection = Client.connections[i];

                    if (connection.type == "minion") {
                        connection.socket.close();
                        Client.connections.splice(i, 1);
                    }
                }

                $("#toggle-minions").css("background-color", "#54c800").text("Start");
            } break;
        }
    };

    Client.toggleOverlayContainers = () => {
        const delay = 50;
        const overlayIsVisible = $("#overlay-container").is(":visible");

        Client.camera.idleS = Client.camera.newS - Client.camera.newS / 15;

        switch (overlayIsVisible) {
            case true: {
                $("#overlay-container").fadeOut("fast");

                setTimeout(() => {
                    $("#game-overlay-container").fadeIn("fast");
                }, delay);
            } break;
            default: {
                $("#game-overlay-container").fadeOut("fast");

                setTimeout(() => {
                    $("#overlay-container").fadeIn("slow");
                }, delay);
            } break;
        }
    };

    Client.toggleSkinSubContainer = (assignedTo) => {
        if ($(".skin-sub-container").is(":visible")) {
            $(".skin-sub-container").fadeOut("fast");
        } else {
            $(".skin-sub-container").fadeIn("fast");
            Client.settings.skinAssignedFor = assignedTo;
            Client.settings.skinAssignedTo = $(`#${assignedTo}-skin-preview`);

            $(".skin-search-item").on("click", function () {
                Client.toggleSkinSubContainer();
                Client.settings.skinAssignedTo.css("background-image", $(this).css("background-image"));

                Client.skin[Client.settings.skinAssignedFor] = $(this).attr("skin-tag");
            });
        }
    };

    Client.util = new Object();

    Client.util.getDate = () => {
        let date = new Date(), hours = date.getHours(), minutes = date.getMinutes(), meridian = " " + hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        return hours + ":" + minutes + meridian;
    };

    Client.util.generateEmojiGraphic = () => {
        const length = $(".chat-emoji-li").length;
        const diameter = 512;

        for (let i = 0; i < length; i++) {
            let graphic = createGraphics(diameter, diameter);

            graphic.background(0, 0, 0, 0);
            graphic.translate(diameter / 2, diameter / 1.9);
            graphic.fill("#FFFFFF");
            graphic.stroke("#000000");
            graphic.strokeWeight(10);
            graphic.imageMode(CENTER);
            graphic.textAlign(CENTER);
            graphic.textSize(Math.floor(diameter * 0.1953125));
            graphic.textFont("Ubuntu");
            graphic.textStyle(BOLD);
            graphic.text($(".chat-emoji-li").eq(i).text(), 0, 0);

            Client.cache.emoji[i] = graphic;
        }
    };

    Client.util.generateMassGraphic = (text) => {
        const diameter = Client.settings.graphicSize;

        let graphic = createGraphics(diameter, diameter);

        graphic.background(0, 0, 0, 0);
        graphic.translate(diameter / 2, diameter / 1.9);
        graphic.fill("#FFFFFF");
        graphic.stroke("#000000");
        graphic.strokeWeight(diameter * 0.01953125);
        graphic.imageMode(CENTER);
        graphic.textAlign(CENTER);
        graphic.textSize(Math.floor(diameter * 0.15625));
        graphic.textFont("Ubuntu");
        graphic.textStyle(BOLD);
        graphic.text(text, 0, 0);

        return graphic;
    };

    Client.util.generateNickGraphic = (text) => {
        const diameter = Client.settings.graphicSize;
        const offset = textWidth(text);

        let nick = createGraphics(diameter, diameter);

        nick.background(0, 0, 0, 0);
        nick.translate(diameter / 2, diameter / 2);
        nick.fill("#FFFFFF");
        nick.stroke("#000000");
        nick.strokeWeight(diameter * 0.01953125);
        nick.imageMode(CENTER);
        nick.textAlign(CENTER);
        nick.textSize(Math.floor(diameter * 0.1953125) / (offset < 25 ? 0.75 : offset / 50));
        nick.textFont("Ubuntu");
        nick.textStyle(BOLD);
        nick.text(text, 0, 0);

        return nick;
    };

    Client.util.generatePelletGraphic = (id, rgb) => {
        const diameter = 32;

        Client.cache.pellet[id] = createGraphics(diameter, diameter);
        Client.cache.pellet[id].background(0, 0, 0, 0);
        Client.cache.pellet[id].translate(diameter / 2, diameter / 2);
        Client.cache.pellet[id].fill(rgb.r, rgb.g, rgb.b);
        Client.cache.pellet[id].noStroke();
        Client.cache.pellet[id].circle(0, 0, diameter);
    };

    Client.util.generateSkinGraphic = (url, id) => {
        loadImage(url, (image) => {
            const diameter = Client.settings.graphicSize;
            let graphic = createGraphics(diameter, diameter);

            graphic.canvas.getContext("2d").save();
            graphic.noFill();
            graphic.stroke(0, 0, 0);
            graphic.strokeWeight(0);
            graphic.ellipse(diameter / 2, diameter / 2, diameter);
            graphic.canvas.getContext("2d").clip();
            graphic.image(image, 0, 0, diameter, diameter);


            const pixels = graphic.canvas.getContext("2d").getImageData(0, 0, diameter, diameter);
            const length = pixels.data.length;

            let scanned = 0;
            let rgb = {
                r: 0,
                g: 0,
                b: 0
            };

            for (let i = 0; i < length; i += 5 * 4) {
                scanned += 1;

                rgb.r += pixels.data[i];
                rgb.g += pixels.data[i + 1];
                rgb.b += pixels.data[i + 2];
            }

            rgb.r = ~~(rgb.r / scanned);
            rgb.g = ~~(rgb.g / scanned);
            rgb.b = ~~(rgb.b / scanned);

            graphic.stroke(rgb.r, rgb.g, rgb.b);
            graphic.strokeWeight(diameter * 0.009765625);
            graphic.ellipse(diameter / 2, diameter / 2, diameter, diameter);
            graphic.canvas.getContext("2d").restore();

            Client.skin.load.push({id: id, graphic: graphic});
        });
    };

    Client.util.generateVirusGraphic = () => {
        const diameter = Client.settings.graphicSize;
        const radius = diameter / 2;
        const weight = diameter * 0.01953125;

        let graphic = createGraphics(diameter, diameter);

        graphic.background(0, 0, 0, 0);
        graphic.translate(radius, radius);
        graphic.fill("#33ff33");
        graphic.stroke("#2de52d");
        graphic.strokeWeight(weight);

        const points = 50;
        const angle = (Math.PI * 2) / points;

        graphic.beginShape();

        for (let a = 0; a < Math.PI * 2; a += angle) {
            let sx = Math.cos(a) * (radius - 5);
            let sy = Math.sin(a) * (radius - 5);

            graphic.vertex(sx, sy);

            sx = Math.cos(a + (angle * 0.5)) * (radius - weight);
            sy = Math.sin(a + (angle * 0.5)) * (radius - weight);

            graphic.vertex(sx, sy);
        }

        graphic.endShape(CLOSE);

        return graphic;
    };

    Client.util.getCameraPosition = () => {
        if (Client.entities.player.length) {
            let length = 0;

            Client.camera.newX = 0;
            Client.camera.newY = 0;
        
            for (let i = 0; i < Client.entities.player.length; i++) {
                let {newX, newY} = Client.entities.player[i];

                if (newX != null && newY != null) {
                    Client.camera.newX += newX;
                    Client.camera.newY += newY;

                    length += 1;
                }
            }

            Client.camera.newX /= length || 1;
            Client.camera.newY /= length || 1;
        }
    };

    Client.util.getSkinFromCurly = (string) => {
        let results = [], re = /{([^}]+)}/g, text;
          
        while (text = re.exec(string)) {
            results.push(text[1]);
        }
        return results;
    }

    Client.util.getEntityById = (id) => {
        return Client.entities.viewport[Client.entities.viewport.findIndex(index => index.id == id)];
    };

    Client.util.getPlayerById = (id) => {
        return Client.entities.player[Client.entities.player.findIndex(index => index.id == id)];
    };

    Client.util.handleLeaderboard = (leaderboard) => {
        $("#leaderboard-ul").html("");

        for (let i = 0; i < leaderboard.length; i++) {
            const {nick, position} = leaderboard[i];
            const leaderboardListItem = `<li class="leaderboard-li"><strong>${position}. ${nick.replace(/{([^}]+)}/g, "")}</strong></li>`;

            $("#leaderboard-ul").append(leaderboardListItem);
        }
    };

    Client.util.handleOnEvents = () => {
        $(".skin-preview").on("click", function () {
            Client.toggleSkinSubContainer($(this).attr("toggle-for"));
        });

        $("#minion-nick").on("keyup", () => {
            setLocal("minion-nick", $("#minion-nick").val());
        }).val(getLocal("minion-nick") || "");

        $("#minion-amount-slider").on("input", function () {
            const amount = $(this).val();

            Client.minion.amount = Number(amount) || 25;
            $("#minion-amount-label").text(`${amount} Bots`);

            setLocal("minion-amount", amount);
        });

        $("#toggle-minions").on("click", () => {
            Client.toggleMinions();
        });

        $("#nick").on("keyup", () => {
            setLocal("nick", $("#nick").val());
        }).val(getLocal("nick") || "");

        $("#play").on("click", () => {
            Client.toggleOverlayContainers();
            Client.spawn();
        });

        $("#graphics").on("change", function () {
            Client.setGraphics($(this).val());
        });

        $(".server-box").on("click", function () {
            $(".server-box").removeClass("server-box-selected");
            $(this).addClass("server-box-selected");

            Client.settings.url = $(this).attr("ip-address");
            Client.connect(Client.settings.url);

            setLocal("ip-address", Client.settings.url);
        });

        $(".chat-emoji-li").on("click", function () {
            Client.sendEmojiMessage($(this).index());
        });
    };

    Client.util.hasEntityId = (id) => {
        return Client.entities.viewport.findIndex(index => index.id == id) > - 1;
    };

    Client.util.hasPlayerId = (id) => {
        return Client.entities.player.findIndex(index => index.id == id) > - 1;
    };

    /* Client Emojis */

    Client.emojis = {
        "0": "😁",
        "1": "🤣",
        "2": "😎",
        "3": "🥳",
        "4": "😤",
        "5": "🤬",
        "6": "💀",
        "7": "👻"
    }

    /* Client Servers */

    Client.servers = {
        "EatCells": "wss://eatcells.com/api/",
        "Ogar": "wss://ogar.eatcells.com/api/",
        "Mivabe": "ws://ogar.mivabe.nl:44411",
        "Ogar2XD": "ws://ogar2xd.glitch.me:80"
    };

    /* Client Settings */

    Client.settings = new Object();

    Client.settings.graphicSize = Number(getLocal("quality")) || 512;
    Client.settings.pixelDensity = Number(getLocal("pixel-density")) || 1;
    Client.settings.quality = getLocal("quality") || "retina";
    Client.settings.url = "wss://eatcells.com/api/";

    /* Client Variables */

    Client.cache = new Object();

    Client.cache.cell = new Array();
    Client.cache.emoji = new Array();
    Client.cache.mass = new Array();
    Client.cache.nick = new Array();
    Client.cache.pellet = new Array();
    Client.cache.virus = Client.util.generateVirusGraphic();

    Client.camera = new Object();

    Client.camera.oldX = 0;
    Client.camera.oldY = 0;
    Client.camera.oldS = 1.25;

    Client.camera.newX = 0;
    Client.camera.newY = 0;
    Client.camera.newS = 0.85;
    Client.camera.idleS = 0.85;

    Client.connections = new Array();

    Client.entities = new Object();
    
    Client.entities.emoji = new Array();
    Client.entities.player = new Array();
    Client.entities.viewport = new Array();

    Client.entities.reset = () => {
        Client.entities.viewport = new Array();

        Client.cache.cell = new Array();
        Client.cache.mass = new Array();
        Client.cache.nick = new Array();
        Client.cache.pellet = new Array();
        Client.cache.virus = Client.util.generateVirusGraphic();
    };

    Client.leaderboard = new Array();

    Client.log = new Object();

    Client.log.lastMessageSent = "";
    Client.log.skinQueuedForDownload = new Array();

    Client.map = new Object();

    Client.map.minX = - 7071;
    Client.map.minY = - 7071;
    Client.map.maxX = 7071;
    Client.map.maxY = 7071;
    Client.map.size = 14142;

    Client.minion = new Object();

    Client.minion.amount = 100;
    Client.minion.status = "inactive";

    Client.skin = new Object();

    Client.skin.list = [{"name":"cookie-mouse","url":"https://i.imgur.com/JO7QwOB.png"},{"name":"planet-cat","url":"https://i.imgur.com/ZMHaR8M.png"},{"name":"poker-ace","url":"https://i.imgur.com/KoZTos3.png"},{"name":"vampy","url":"https://i.imgur.com/UqRF8VY.png"},{"name":"fox-mask","url":"https://i.imgur.com/SzIRdrA.png"},{"name":"love-cat","url":"https://i.imgur.com/kzsQf4r.png"},{"name":"mr.-goose","url":"https://i.imgur.com/RQCHJXE.png"},{"name":"nutcracker","url":"https://i.imgur.com/9CgyRh7.png"},{"name":"piglet","url":"https://i.imgur.com/E3dkEcT.png"},{"name":"lava-beast","url":"https://i.imgur.com/qiJTyGB.png"},{"name":"astral-deer","url":"https://i.imgur.com/zpGDOR7.png"},{"name":"bionic-ram","url":"https://i.imgur.com/FQuecsc.png"},{"name":"hyper-coffee","url":"https://i.imgur.com/Lw8atGu.png"},{"name":"cosmic-horse","url":"https://i.imgur.com/xXjUL5P.png"},{"name":"cat-burglar","url":"https://i.imgur.com/8fseI3W.png"},{"name":"slime-beast","url":"https://i.imgur.com/zK4htW1.png"},{"name":"lucky-doll","url":"https://i.imgur.com/Gn7rLI4.png"},{"name":"oni","url":"https://i.imgur.com/i8ZX3dr.png"},{"name":"guard-dog","url":"https://i.imgur.com/0AgT4dd.png"},{"name":"wide-eye","url":"https://i.imgur.com/oTYUjDv.png"},{"name":"sleepy-fox","url":"https://i.imgur.com/vhEjzCj.png"},{"name":"game-host","url":"https://i.imgur.com/9MPWwl3.png"},{"name":"blue-skull","url":"https://i.imgur.com/cQBVVRE.png"},{"name":"voracious","url":"https://i.imgur.com/cRI12Kk.png"},{"name":"sand-worm","url":"https://i.imgur.com/kxfAVch.png"},{"name":"mushroom-face","url":"https://i.imgur.com/4iiSeWi.png"},{"name":"steampunk-cat","url":"https://i.imgur.com/z5stx36.png"},{"name":"merry-pencil","url":"https://i.imgur.com/hEL7ygK.png"},{"name":"cybernaut","url":"https://i.imgur.com/yKrZjF7.png"},{"name":"wolf-man","url":"https://i.imgur.com/ORUFSvf.png"},{"name":"skull-magician","url":"https://i.imgur.com/cwJgQOz.png"},{"name":"tiny-reaper","url":"https://i.imgur.com/ZIibUmI.png"},{"name":"abductor","url":"https://i.imgur.com/dPCApTo.png"},{"name":"snout","url":"https://i.imgur.com/e4Pkb4z.png"},{"name":"glucose","url":"https://i.imgur.com/0TZ7FCi.png"},{"name":"unconeditionally","url":"https://i.imgur.com/gMi0irG.png"},{"name":"pudding","url":"https://i.imgur.com/TAhrePY.png"},{"name":"muscaria","url":"https://i.imgur.com/oxg2IqQ.png"},{"name":"octashroom","url":"https://i.imgur.com/621n3Of.png"},{"name":"kaiju-shroom","url":"https://i.imgur.com/qkrwu5x.png"},{"name":"mino-pirate","url":"https://i.imgur.com/lD8oZjI.png"},{"name":"brainless","url":"https://i.imgur.com/kQFrzBG.png"},{"name":"count-flaky","url":"https://i.imgur.com/Yrc5Osg.png"},{"name":"impastable","url":"https://i.imgur.com/O8VUSjd.png"},{"name":"biteaminc","url":"https://i.imgur.com/CUgmGh7.png"},{"name":"fun-g","url":"https://i.imgur.com/vCqnHv1.png"},{"name":"amanita","url":"https://i.imgur.com/r7HG7G6.png"},{"name":"suillus","url":"https://i.imgur.com/4i1Jcot.png"},{"name":"old-chipper","url":"https://i.imgur.com/1pvtT55.png"},{"name":"lets-roll","url":"https://i.imgur.com/fOhHsic.png"},{"name":"forkive-me","url":"https://i.imgur.com/udGYNQl.png"},{"name":"too-cheesy","url":"https://i.imgur.com/whOcDkX.png"},{"name":"impopsicle","url":"https://i.imgur.com/9eZh3lI.png"},{"name":"bake-me","url":"https://i.imgur.com/gC5L9Km.png"},{"name":"cherriffic","url":"https://i.imgur.com/Iz6zyzH.png"},{"name":"catzilla","url":"https://i.imgur.com/5niMj0I.png"},{"name":"the-phanthom-thief","url":"https://i.imgur.com/HZ3PMKA.png"},{"name":"the-enforcer","url":"https://i.imgur.com/GXkAA6S.png"},{"name":"wild-card","url":"https://i.imgur.com/WBAq3Jw.png"},{"name":"the-locksmith","url":"https://i.imgur.com/vUeIrKr.png"},{"name":"the-anarchist","url":"https://i.imgur.com/OSPjnfB.png"},{"name":"need-space","url":"https://i.imgur.com/NkrkFSA.png"},{"name":"red-knight","url":"https://i.imgur.com/tqMTBo6.png"},{"name":"toast-tally","url":"https://i.imgur.com/tvDragy.png"},{"name":"starsign-capricorn","url":"https://i.imgur.com/gzxb7ov.png"},{"name":"starsign-sagittarius","url":"https://i.imgur.com/hIcec97.png"},{"name":"arthropod","url":"https://i.imgur.com/MDzpQjc.png"},{"name":"twins","url":"https://i.imgur.com/ydViKOB.png"},{"name":"centaur","url":"https://i.imgur.com/S0ATqFa.png"},{"name":"starsign-scorpio","url":"https://i.imgur.com/OT6898O.png"},{"name":"funky-angel","url":"https://i.imgur.com/3XRAI2z.png"},{"name":"starsign-libra","url":"https://i.imgur.com/rvyXpJq.png"},{"name":"starsign-virgo","url":"https://i.imgur.com/czUHUBY.png"},{"name":"starsign-leo","url":"https://i.imgur.com/jbmKH5c.png"},{"name":"festive-monkey","url":"https://i.imgur.com/aXqN3s9.png"},{"name":"pandamonium","url":"https://i.imgur.com/tFky7ac.png"},{"name":"party-howl","url":"https://i.imgur.com/WePR7S4.png"},{"name":"toasty","url":"https://i.imgur.com/gYVvqJK.png"},{"name":"unbread","url":"https://i.imgur.com/8R08USU.png"},{"name":"onion-king","url":"https://i.imgur.com/y32HwOX.png"},{"name":"starsign-cancer","url":"https://i.imgur.com/QqS58La.png"},{"name":"gunky","url":"https://i.imgur.com/SiTcqZK.png"},{"name":"icky","url":"https://i.imgur.com/GZgicg4.png"},{"name":"gooey","url":"https://i.imgur.com/QFPxUeA.png"},{"name":"starsign-gemini","url":"https://i.imgur.com/AulPfZm.png"},{"name":"derpy-stegosaurus","url":"https://i.imgur.com/i0PfWFT.png"},{"name":"derpy-elasmosaurus","url":"https://i.imgur.com/Xs2qp9O.png"},{"name":"derpy-t-rex","url":"https://i.imgur.com/HLJXcc5.png"},{"name":"ragnarok","url":"https://i.imgur.com/Wxz1AxJ.png"},{"name":"titanomachy","url":"https://i.imgur.com/Uv6GCgb.png"},{"name":"weirdough","url":"https://i.imgur.com/eHBNe7z.png"},{"name":"creepy-crepe","url":"https://i.imgur.com/FFndq3k.png"},{"name":"salty-assault","url":"https://i.imgur.com/2g6btv8.png"},{"name":"starsign-taurus","url":"https://i.imgur.com/iVCk2aJ.png"},{"name":"rainbow-tusk","url":"https://i.imgur.com/2EYfXut.png"},{"name":"prismatic-jackal","url":"https://i.imgur.com/byHpYDJ.png"},{"name":"chikadahr","url":"https://i.imgur.com/8aP8Zl6.png"},{"name":"squiggle","url":"https://i.imgur.com/tUa0bte.png"},{"name":"bubbabutt","url":"https://i.imgur.com/eHBK31Q.png"},{"name":"starsign-aries","url":"https://i.imgur.com/9RuAAWi.png"},{"name":"pickeyes","url":"https://i.imgur.com/reVykon.png"},{"name":"lovesick-ted","url":"https://i.imgur.com/pFmrkBN.png"},{"name":"cheesy","url":"https://i.imgur.com/tLabRJG.png"},{"name":"peppegario","url":"https://i.imgur.com/BCkOQn8.png"},{"name":"aqugly","url":"https://i.imgur.com/oTNw5SP.png"},{"name":"sluggy","url":"https://i.imgur.com/5T0UjE1.png"},{"name":"mari-monshroom","url":"https://i.imgur.com/2NTSxR1.png"},{"name":"big-mustagus","url":"https://i.imgur.com/ZP4O0RM.png"},{"name":"agent-morel","url":"https://i.imgur.com/3cqdfXu.png"},{"name":"wild-cooper","url":"https://i.imgur.com/Ww1Y9ea.png"},{"name":"torch-header","url":"https://i.imgur.com/z6WAKDY.png"},{"name":"capsicum","url":"https://i.imgur.com/02e8W8T.png"},{"name":"wicked-frosty","url":"https://i.imgur.com/iEirWpd.png"},{"name":"big-horn","url":"https://i.imgur.com/ivnWyt3.png"},{"name":"hunter-fox","url":"https://i.imgur.com/Wvxd1nJ.png"},{"name":"young-bonny","url":"https://i.imgur.com/I4GKH7j.png"},{"name":"calico-jack","url":"https://i.imgur.com/8MnHows.png"},{"name":"rockhopper","url":"https://i.imgur.com/Lkjuzca.png"},{"name":"amur","url":"https://i.imgur.com/YHSo47P.png"},{"name":"baobao","url":"https://i.imgur.com/ImnivYF.png"},{"name":"sagiastrous","url":"https://i.imgur.com/ryuUaJn.png"},{"name":"guerrilla-boss","url":"https://i.imgur.com/WBxn97S.png"},{"name":"grey-fang","url":"https://i.imgur.com/kXalRxj.png"},{"name":"nomster","url":"https://i.imgur.com/jrqJdhi.png"},{"name":"green-grub","url":"https://i.imgur.com/ZmVF2W2.png"},{"name":"cookie-robber","url":"https://i.imgur.com/zk3fFeo.png"},{"name":"skullpio","url":"https://i.imgur.com/Nw9rNJF.png"},{"name":"king-ghoulish","url":"https://i.imgur.com/FEfVJ1q.png"},{"name":"gummy","url":"https://i.imgur.com/nFCctIo.png"},{"name":"moose","url":"https://i.imgur.com/MKmPf3n.png"},{"name":"delli","url":"https://i.imgur.com/TMDYpKk.png"},{"name":"black-panther","url":"https://i.imgur.com/nVbKpwm.png"},{"name":"devadip","url":"https://i.imgur.com/pbcZnfQ.png"},{"name":"devilish","url":"https://i.imgur.com/ep0wlIi.png"},{"name":"le-smash","url":"https://i.imgur.com/7NIxd4h.png"},{"name":"big-power","url":"https://i.imgur.com/DeYcYbi.png"},{"name":"big-muggy","url":"https://i.imgur.com/iFBcHbB.png"},{"name":"great-white","url":"https://i.imgur.com/CMIg1BN.png"},{"name":"gryphon-boss","url":"https://i.imgur.com/ITgMwx2.png"},{"name":"dattebayo","url":"https://i.imgur.com/9x6xo6E.png"},{"name":"blackleg","url":"https://i.imgur.com/fDYoTq0.png"},{"name":"funguys","url":"https://i.imgur.com/rE7RfUj.png"},{"name":"cootie","url":"https://i.imgur.com/eoLtUEd.png"},{"name":"screamer","url":"https://i.imgur.com/WavAHcf.png"},{"name":"makinbakin","url":"https://i.imgur.com/0DsdtoF.png"},{"name":"porky","url":"https://i.imgur.com/xwmaHy2.png"},{"name":"lurid","url":"https://i.imgur.com/KtJZbKY.png"},{"name":"virgawful","url":"https://i.imgur.com/Ng3l6TC.png"},{"name":"bandit","url":"https://i.imgur.com/qB47IZU.png"},{"name":"chief","url":"https://i.imgur.com/S5FV2hv.png"},{"name":"stud","url":"https://i.imgur.com/5bDPTID.png"},{"name":"jungle-tiger","url":"https://i.imgur.com/PofwxdX.png"},{"name":"wolf-boss","url":"https://i.imgur.com/uDyLukl.png"},{"name":"giant-snake","url":"https://i.imgur.com/UbxEUn0.png"},{"name":"davyborg","url":"https://i.imgur.com/TurUGs3.png"},{"name":"croc-fu","url":"https://i.imgur.com/SQ2zMWe.png"},{"name":"octoeira","url":"https://i.imgur.com/8MKLTAo.png"},{"name":"krav-monki","url":"https://i.imgur.com/cE1Suw2.png"},{"name":"beast-leo","url":"https://i.imgur.com/s2tycmW.png"},{"name":"concentrated","url":"https://i.imgur.com/ZN9gAzc.png"},{"name":"river-crocodile","url":"https://i.imgur.com/Y2SybtK.png"},{"name":"skullboss","url":"https://i.imgur.com/j6oe9WX.png"},{"name":"fury-bird","url":"https://i.imgur.com/ejlkbPM.png"},{"name":"beardy-girl","url":"https://i.imgur.com/lcsgX2A.png"},{"name":"cancerous","url":"https://i.imgur.com/akUrtDv.png"},{"name":"narwuul","url":"https://i.imgur.com/kyJw2O7.png"},{"name":"cosmicwolf","url":"https://i.imgur.com/eO4xxMV.png"},{"name":"inflamed","url":"https://i.imgur.com/nOk4F0h.png"},{"name":"killeroctopus","url":"https://i.imgur.com/YsgXUH1.png"},{"name":"zombishrum","url":"https://i.imgur.com/8qKV5q5.png"},{"name":"mushroom-bot","url":"https://i.imgur.com/aSFjmyE.png"},{"name":"snoochieboochie","url":"https://i.imgur.com/aI4LsCU.png"},{"name":"midnight-wolf","url":"https://i.imgur.com/N65X15B.png"},{"name":"geminhate","url":"https://i.imgur.com/VV6Fk04.png"},{"name":"spongecake","url":"https://i.imgur.com/Sy7cdwB.png"},{"name":"dohnut","url":"https://i.imgur.com/uIK5ui6.png"},{"name":"moofun","url":"https://i.imgur.com/aPNaFEh.png"},{"name":"wahfull","url":"https://i.imgur.com/8T56EBm.png"},{"name":"snailbun","url":"https://i.imgur.com/jGxBq5a.png"},{"name":"octogummy","url":"https://i.imgur.com/sQQoVPv.png"},{"name":"icecreamy","url":"https://i.imgur.com/edc7DzD.png"},{"name":"cobra","url":"https://i.imgur.com/bleO1kz.png"},{"name":"ghost-reaper","url":"https://i.imgur.com/mW2RSTR.png"},{"name":"viletauro","url":"https://i.imgur.com/81eF1Q4.png"},{"name":"cheshire","url":"https://i.imgur.com/NumgVni.png"},{"name":"hatter","url":"https://i.imgur.com/ALmUei2.png"},{"name":"mindseye","url":"https://i.imgur.com/CQftc4R.png"},{"name":"madshroom","url":"https://i.imgur.com/lr979Db.png"},{"name":"enokuous","url":"https://i.imgur.com/vfgLCze.png"},{"name":"african-lion","url":"https://i.imgur.com/EkJOlEh.png"},{"name":"desert-worm","url":"https://i.imgur.com/yeri4WR.png"},{"name":"arievil","url":"https://i.imgur.com/VpoUksM.png"},{"name":"barrel","url":"https://i.imgur.com/HIPbhdp.png"},{"name":"attabouy","url":"https://i.imgur.com/09j98HA.png"},{"name":"fangtooth","url":"https://i.imgur.com/MigfXWj.png"},{"name":"bald-eagle","url":"https://i.imgur.com/JBqzYOH.png"},{"name":"direction-giver","url":"https://i.imgur.com/az8sJcE.png"},{"name":"health-fixer","url":"https://i.imgur.com/2CLAWvo.png"},{"name":"thirst-quencher","url":"https://i.imgur.com/Kzxo7I8.png"},{"name":"tummy-filler","url":"https://i.imgur.com/RZKo9EA.png"},{"name":"dragon-god","url":"https://i.imgur.com/I9Zehpq.png"},{"name":"dollhouse","url":"https://i.imgur.com/omsSFEt.png"},{"name":"plague","url":"https://i.imgur.com/nvJ8fZ2.png"},{"name":"nibblebug","url":"https://i.imgur.com/ljlVfBm.png"},{"name":"shot-of-love","url":"https://i.imgur.com/l9IgFwk.png"},{"name":"gorilla","url":"https://i.imgur.com/Y7SAws8.png"},{"name":"in-cog-nito","url":"https://i.imgur.com/xqwn1L1.png"},{"name":"lit","url":"https://i.imgur.com/CnBdzy8.png"},{"name":"steam-skull","url":"https://i.imgur.com/6nIxas5.png"},{"name":"giant-spider","url":"https://i.imgur.com/NZrBSFA.png"},{"name":"demon","url":"https://i.imgur.com/hbgN4uN.png"},{"name":"christmas-kittie","url":"https://i.imgur.com/XhI69Ed.png"},{"name":"dog-life","url":"https://i.imgur.com/vtMAm4i.png"},{"name":"omnom-gator","url":"https://i.imgur.com/nVkQpyJ.png"},{"name":"omnom-lion","url":"https://i.imgur.com/7CPXBNK.png"},{"name":"omnom-snek","url":"https://i.imgur.com/RDDMLTe.png"},{"name":"cthulhu","url":"https://i.imgur.com/Nbws3ko.png"},{"name":"rose","url":"https://i.imgur.com/sSH8GrY.png"},{"name":"entertainer","url":"https://i.imgur.com/q8bZTse.png"},{"name":"battle-angel","url":"https://i.imgur.com/n7IQDBy.png"},{"name":"toco-bones","url":"https://i.imgur.com/0iSveWl.png"},{"name":"party-bones","url":"https://i.imgur.com/frSM7aA.png"},{"name":"evil-pumpkin","url":"https://i.imgur.com/KIT7ZBL.png"},{"name":"scary-teddy","url":"https://i.imgur.com/6SJaPR6.png"},{"name":"leviathan","url":"https://i.imgur.com/agKpyKX.png"},{"name":"good-boy","url":"https://i.imgur.com/ForPRB3.png"},{"name":"wilson","url":"https://i.imgur.com/hC0Dp3P.png"},{"name":"murder-ball","url":"https://i.imgur.com/huX7R16.png"},{"name":"demolition-expert","url":"https://i.imgur.com/IgPZLgy.png"},{"name":"brute-prankster","url":"https://i.imgur.com/2xy8EcB.png"},{"name":"smooth-operator","url":"https://i.imgur.com/q5gQoiH.png"},{"name":"dasher","url":"https://i.imgur.com/qBpjJZp.png"},{"name":"snowy-joe","url":"https://i.imgur.com/HX4XbA2.png"},{"name":"big-banjo","url":"https://i.imgur.com/2M7VPQe.png"},{"name":"mistletoe-madness","url":"https://i.imgur.com/P9zmWDc.png"},{"name":"skull-claus","url":"https://i.imgur.com/lqXt6oZ.png"},{"name":"cuppy","url":"https://i.imgur.com/WlT52o1.png"},{"name":"melting-man","url":"https://i.imgur.com/wmX82Db.png"},{"name":"crazy-rudolph","url":"https://i.imgur.com/UhlNTvh.png"},{"name":"beat-box","url":"https://i.imgur.com/XstZWPU.png"},{"name":"rastafari","url":"https://i.imgur.com/sn2jfBE.png"},{"name":"punk","url":"https://i.imgur.com/HDeh6Mz.png"},{"name":"wasted-mouse","url":"https://i.imgur.com/iFSbgl1.png"},{"name":"mr.-spanks","url":"https://i.imgur.com/ST6vRzV.png"},{"name":"chillpanze","url":"https://i.imgur.com/VZdX2Hf.png"},{"name":"psychopanda","url":"https://i.imgur.com/NK3zXNH.png"},{"name":"beetoothven","url":"https://i.imgur.com/0rT00YM.png"},{"name":"tape-guy","url":"https://i.imgur.com/AxKmrwq.png"},{"name":"silent-nun","url":"https://i.imgur.com/mcRqseB.png"},{"name":"minotaur","url":"https://i.imgur.com/HroGBHG.png"},{"name":"wicked-vendetta","url":"https://i.imgur.com/DrDDauK.png"},{"name":"mexican-skull","url":"https://i.imgur.com/vFX93e2.png"},{"name":"nightmare","url":"https://i.imgur.com/mruXR89.png"},{"name":"bewitched","url":"https://i.imgur.com/kiOZdBt.png"},{"name":"monday-worker","url":"https://i.imgur.com/rMhbAzZ.png"},{"name":"dumboon","url":"https://i.imgur.com/fDMoHvK.png"},{"name":"ark-raider","url":"https://i.imgur.com/ZJC88iZ.png"},{"name":"divine-pearl","url":"https://i.imgur.com/Pv2rCy0.png"},{"name":"evil-genie","url":"https://i.imgur.com/Mg7KKKa.png"},{"name":"unknown-totem","url":"https://i.imgur.com/4hl9VJx.png"},{"name":"ancient-relic","url":"https://i.imgur.com/wwSGUGH.png"},{"name":"mad-fragment","url":"https://i.imgur.com/uVde10n.png"},{"name":"techno-kat","url":"https://i.imgur.com/PD408im.png"},{"name":"bionic","url":"https://i.imgur.com/3E6dg7l.png"},{"name":"bass-bomb","url":"https://i.imgur.com/1ZpSRTc.png"},{"name":"techno-quack","url":"https://i.imgur.com/AG5cqQg.png"},{"name":"electro-jelly","url":"https://i.imgur.com/USPIBPi.png"},{"name":"cyber-monk","url":"https://i.imgur.com/rWJXhLc.png"},{"name":"cyber-demon","url":"https://i.imgur.com/mZV6F67.png"},{"name":"cyber-psychic","url":"https://i.imgur.com/1X5dHog.png"},{"name":"electronic-girl","url":"https://i.imgur.com/5DwwRUd.png"},{"name":"cyber-punk","url":"https://i.imgur.com/pA8U5Gl.png"},{"name":"techno-ninja","url":"https://i.imgur.com/elQukz4.png"},{"name":"eager-alien","url":"https://i.imgur.com/GB6f7zZ.png"},{"name":"cap'n-joe","url":"https://i.imgur.com/fEwP6KJ.png"},{"name":"guardian","url":"https://i.imgur.com/C5kPUPb.png"},{"name":"mecha-toad","url":"https://i.imgur.com/JtLbPGU.png"},{"name":"mecha-parrot","url":"https://i.imgur.com/cml4GcU.png"},{"name":"mecha-destroyer","url":"https://i.imgur.com/W78jFCH.png"},{"name":"caribbean-corsair","url":"https://i.imgur.com/AtncJdq.png"},{"name":"deathly-mine","url":"https://i.imgur.com/gYpfVkq.png"},{"name":"fake-chest","url":"https://i.imgur.com/Z4Tn0ZE.png"},{"name":"deadly-piranha","url":"https://i.imgur.com/na7b5p6.png"},{"name":"mad-jawz","url":"https://i.imgur.com/4UXM3Tb.png"},{"name":"power-mask","url":"https://i.imgur.com/lToRJcF.png"},{"name":"spike-fish","url":"https://i.imgur.com/rO7JfaC.png"},{"name":"cool-lion","url":"https://i.imgur.com/kAw63GO.png"},{"name":"surfin-bird","url":"https://i.imgur.com/r85gEKf.png"},{"name":"jelly-diver","url":"https://i.imgur.com/rh7u4et.png"},{"name":"skull-swords","url":"https://i.imgur.com/VBkonZ4.png"},{"name":"cactus-flower","url":"https://i.imgur.com/P6rfgrY.png"},{"name":"pepe-loco","url":"https://i.imgur.com/qZKEQN7.png"},{"name":"mariachi","url":"https://i.imgur.com/NxtQB2J.png"},{"name":"suplex","url":"https://i.imgur.com/1VvObCm.png"},{"name":"feather-dragon","url":"https://i.imgur.com/M1uDlZI.png"},{"name":"bull-skull","url":"https://i.imgur.com/NjgvsoM.png"},{"name":"the-stranger","url":"https://i.imgur.com/VoJXu5u.png"},{"name":"wild-pepper","url":"https://i.imgur.com/ZeFnZQv.png"},{"name":"mad-muffin","url":"https://i.imgur.com/FSWOy1Q.png"},{"name":"candy-genius","url":"https://i.imgur.com/HBAMs5d.png"},{"name":"sour-candy","url":"https://i.imgur.com/zK4gxF1.png"},{"name":"sugar-dash","url":"https://i.imgur.com/s7rNjb0.png"},{"name":"chip-cookie","url":"https://i.imgur.com/WcZoqgE.png"},{"name":"sweet-tendril","url":"https://i.imgur.com/SjphTDh.png"},{"name":"jelly-bear","url":"https://i.imgur.com/LtaOguw.png"},{"name":"candy-troll","url":"https://i.imgur.com/zczycHP.png"},{"name":"spike-flower","url":"https://i.imgur.com/A53kdeV.png"},{"name":"sunflower","url":"https://i.imgur.com/mUjH7JQ.png"},{"name":"hornet","url":"https://i.imgur.com/ZJuKHXa.png"},{"name":"skull-artifact","url":"https://i.imgur.com/5EczGQ8.png"},{"name":"troldir","url":"https://i.imgur.com/J4xxaMb.png"},{"name":"forest-spirit","url":"https://i.imgur.com/yJ9NTmt.png"},{"name":"silly-griffin","url":"https://i.imgur.com/vbuC0DI.png"},{"name":"rowdy-shroom","url":"https://i.imgur.com/aXuxCCJ.png"},{"name":"sorceress","url":"https://i.imgur.com/W6uZBFc.png"},{"name":"gnome-mage","url":"https://i.imgur.com/FJQRbVo.png"},{"name":"elven-noble","url":"https://i.imgur.com/N92oOhY.png"},{"name":"crazy-bolt","url":"https://i.imgur.com/q3mYvSR.png"},{"name":"mechanicat","url":"https://i.imgur.com/3jnmzS1.png"},{"name":"pisces","url":"https://i.imgur.com/ir3hfnB.png"},{"name":"ada","url":"https://i.imgur.com/CGzGjdv.png"},{"name":"watson","url":"https://i.imgur.com/VlrzDke.png"},{"name":"steam-diver","url":"https://i.imgur.com/fMLjpA8.png"},{"name":"cog-attack","url":"https://i.imgur.com/zciJPDS.png"},{"name":"power-glove","url":"https://i.imgur.com/Xcgsfvw.png"},{"name":"burner","url":"https://i.imgur.com/76siELZ.png"},{"name":"space-ink","url":"https://i.imgur.com/WGTHi4P.png"},{"name":"alien-artist","url":"https://i.imgur.com/uXKGUNV.png"},{"name":"aquarius","url":"https://i.imgur.com/gc1b6mY.png"},{"name":"spogh","url":"https://i.imgur.com/xW1pjYB.png"},{"name":"moon-alisa","url":"https://i.imgur.com/S7luV64.png"},{"name":"shrieker","url":"https://i.imgur.com/nJT5s2z.png"},{"name":"elite-pilot","url":"https://i.imgur.com/0rLS44x.png"},{"name":"cyber-commando","url":"https://i.imgur.com/CKril1X.png"},{"name":"red-pulse","url":"https://i.imgur.com/ww3EvI0.png"},{"name":"rocket-deer","url":"https://i.imgur.com/M9s3XZE.png"},{"name":"snow-biker","url":"https://i.imgur.com/G88UYSZ.png"},{"name":"bad-santa","url":"https://i.imgur.com/06in96h.png"},{"name":"capricorn","url":"https://i.imgur.com/4Aa2s8f.png"},{"name":"scythe","url":"https://i.imgur.com/zAbRp9t.png"},{"name":"soul-hunter","url":"https://i.imgur.com/yIWbX4y.png"},{"name":"warhorse","url":"https://i.imgur.com/yRXKeIC.png"},{"name":"alone","url":"https://i.imgur.com/dGF41VE.png"},{"name":"yuno","url":"https://i.imgur.com/CzEDOIE.png"},{"name":"rage","url":"https://i.imgur.com/rx589bx.png"},{"name":"grizzly","url":"https://i.imgur.com/LfYGFrU.png"},{"name":"bullet-man","url":"https://i.imgur.com/0aBIlpG.png"},{"name":"wicked-clown","url":"https://i.imgur.com/ELNKNlB.png"},{"name":"saggitarius","url":"https://i.imgur.com/7ARP6OF.png"},{"name":"ice-crystal","url":"https://i.imgur.com/Y7sMeRK.png"},{"name":"dire-wolf","url":"https://i.imgur.com/TqT68Rh.png"},{"name":"ice-lord","url":"https://i.imgur.com/priCip1.png"},{"name":"giant-human","url":"https://i.imgur.com/O3bJ1hI.png"},{"name":"power-ninja","url":"https://i.imgur.com/z6aKU0W.png"},{"name":"skull-bow","url":"https://i.imgur.com/El1oS48.png"},{"name":"wendigo","url":"https://i.imgur.com/lrvFN31.png"},{"name":"red-fiend","url":"https://i.imgur.com/aDn53Fe.png"},{"name":"night-hunter","url":"https://i.imgur.com/RXAmIWn.png"},{"name":"scorpio","url":"https://i.imgur.com/ahNZAuK.png"},{"name":"skull-samurai","url":"https://i.imgur.com/yll7TV5.png"},{"name":"rogue-samurai","url":"https://i.imgur.com/SMmIaqV.png"},{"name":"war-mask","url":"https://i.imgur.com/f8OgvVa.png"},{"name":"think-tank","url":"https://i.imgur.com/Ou8JiR4.png"},{"name":"can-man","url":"https://i.imgur.com/BXcebLJ.png"},{"name":"the-tinker","url":"https://i.imgur.com/q054wMz.png"},{"name":"scarab","url":"https://i.imgur.com/fMKbHOn.png"},{"name":"anubis","url":"https://i.imgur.com/kQz2hjk.png"},{"name":"mummy-king","url":"https://i.imgur.com/s2ssupy.png"},{"name":"dragon-viper","url":"https://i.imgur.com/aLCT2Bd.png"},{"name":"dragon-razor","url":"https://i.imgur.com/kgJSQ27.png"},{"name":"dragon-haze","url":"https://i.imgur.com/gsBaYhg.png"},{"name":"libra","url":"https://i.imgur.com/SOwi1p7.png"},{"name":"shuriken","url":"https://i.imgur.com/TZSXZvo.png"},{"name":"shadow","url":"https://i.imgur.com/0ZAiHzD.png"},{"name":"steel-ram","url":"https://i.imgur.com/sEWgoMQ.png"},{"name":"zeus","url":"https://i.imgur.com/DC7vhGV.png"},{"name":"ares","url":"https://i.imgur.com/7mePBlw.png"},{"name":"hades","url":"https://i.imgur.com/45fCvcu.png"},{"name":"virgo","url":"https://i.imgur.com/4yxrlyO.png"},{"name":"power-fighter","url":"https://i.imgur.com/ICUugcD.png"},{"name":"techno-kid","url":"https://i.imgur.com/xcpWt2V.png"},{"name":"pixel-kong","url":"https://i.imgur.com/DMTPRJh.png"},{"name":"healing-potion","url":"https://i.imgur.com/TEztdR7.png"},{"name":"raid-boss","url":"https://i.imgur.com/jUQwITw.png"},{"name":"scroll","url":"https://i.imgur.com/K90MJ3r.png"},{"name":"the-maw","url":"https://i.imgur.com/fHla4lb.png"},{"name":"walking-hand","url":"https://i.imgur.com/QoEym8t.png"},{"name":"zombie-party","url":"https://i.imgur.com/vwoVSCI.png"},{"name":"dazzled","url":"https://i.imgur.com/BFmAStg.png"},{"name":"nerdy","url":"https://i.imgur.com/Kga31V3.png"},{"name":"rabid","url":"https://i.imgur.com/F1TwEgE.png"},{"name":"delighted","url":"https://i.imgur.com/AgYN3rh.png"},{"name":"odd","url":"https://i.imgur.com/3D6Z8Uj.png"},{"name":"funky","url":"https://i.imgur.com/b4Y9ON6.png"},{"name":"angry","url":"https://i.imgur.com/hd5JTT2.png"},{"name":"vicious","url":"https://i.imgur.com/6tzIsVN.png"},{"name":"leo","url":"https://i.imgur.com/8gAcXNC.png"},{"name":"fury-cat","url":"https://i.imgur.com/3bP56iT.png"},{"name":"orc-warrior","url":"https://i.imgur.com/gsIuGpe.png"},{"name":"orc-grunt","url":"https://i.imgur.com/K4yX8r8.png"},{"name":"cursed-blade","url":"https://i.imgur.com/p9Qro4C.png"},{"name":"mechatron","url":"https://i.imgur.com/i9GYCjh.png"},{"name":"yellow-streak","url":"https://i.imgur.com/ISLopXX.png"},{"name":"supremus","url":"https://i.imgur.com/0d3lWI1.png"},{"name":"the-professional","url":"https://i.imgur.com/poWLd8s.png"},{"name":"slingblade","url":"https://i.imgur.com/Of0hrpS.png"},{"name":"slaughter","url":"https://i.imgur.com/Ksi83k1.png"},{"name":"elephant-ball","url":"https://i.imgur.com/ju2c7X7.png"},{"name":"pig-ball","url":"https://i.imgur.com/DSuUNtx.png"},{"name":"sheep-ball","url":"https://i.imgur.com/Jhh5nYu.png"},{"name":"skull-ribbon","url":"https://i.imgur.com/RHHNc6U.png"},{"name":"mega-power","url":"https://i.imgur.com/q82DwBe.png"},{"name":"eyepatch","url":"https://i.imgur.com/sinz3ZH.png"},{"name":"amber","url":"https://i.imgur.com/M9vznpd.png"},{"name":"stone-tool","url":"https://i.imgur.com/mUoxLra.png"},{"name":"fire-face","url":"https://i.imgur.com/Q4yVycT.png"},{"name":"greatzilla","url":"https://i.imgur.com/2f20uaU.png"},{"name":"giant-skull","url":"https://i.imgur.com/vCJRA6Q.png"},{"name":"general","url":"https://i.imgur.com/BhdtorZ.png"},{"name":"wacky-egg","url":"https://i.imgur.com/6jdS6Bg.png"},{"name":"easter-chick","url":"https://i.imgur.com/b8V1PHv.png"},{"name":"cool-bunny","url":"https://i.imgur.com/xcSua1c.png"},{"name":"bull-king","url":"https://i.imgur.com/2lyVD9A.png"},{"name":"fire-rooster","url":"https://i.imgur.com/SbSGplZ.png"},{"name":"jade-dragon","url":"https://i.imgur.com/U1J2XQV.png"},{"name":"chicken","url":"https://i.imgur.com/o4ZSnev.png"},{"name":"troll-face","url":"https://i.imgur.com/msMahbQ.png"},{"name":"lol","url":"https://i.imgur.com/N10Vxmz.png"},{"name":"taco","url":"https://i.imgur.com/Gow8RZw.png"},{"name":"droid","url":"https://i.imgur.com/KnYODp0.png"},{"name":"detective","url":"https://i.imgur.com/PAarjdW.png"},{"name":"cyber-agent","url":"https://i.imgur.com/DVBO9X5.png"},{"name":"dark-wings","url":"https://i.imgur.com/ff9V0cP.png"},{"name":"gryphon","url":"https://i.imgur.com/jagn6AX.png"},{"name":"diver","url":"https://i.imgur.com/9SToXPv.png"},{"name":"trickster","url":"https://i.imgur.com/QdpJA1O.png"},{"name":"bird-mask","url":"https://i.imgur.com/vM9AX4w.png"},{"name":"golden-mask","url":"https://i.imgur.com/qfFnr8i.png"},{"name":"hot-taco","url":"https://i.imgur.com/DET5GHR.png"},{"name":"crazy-sombrero","url":"https://i.imgur.com/jA8jhW1.png"},{"name":"maracas","url":"https://i.imgur.com/agfMZwu.png"},{"name":"cloud-prism","url":"https://i.imgur.com/CEfm2qS.png"},{"name":"red-beard","url":"https://i.imgur.com/qNRi8td.png"},{"name":"gold-rush","url":"https://i.imgur.com/arFr2XD.png"},{"name":"destroyer","url":"https://i.imgur.com/5w0alIc.png"},{"name":"storm-fist","url":"https://i.imgur.com/PX1wl3M.png"},{"name":"war-hero","url":"https://i.imgur.com/B7f070H.png"},{"name":"love-arrow","url":"https://i.imgur.com/WjLVBGZ.png"},{"name":"strawberry","url":"https://i.imgur.com/Cg8Ds6K.png"},{"name":"choco-heart","url":"https://i.imgur.com/mmsQXhm.png"},{"name":"tiny-jack","url":"https://i.imgur.com/fjE5AYc.png"},{"name":"jade","url":"https://i.imgur.com/npC3i9J.png"},{"name":"merry-outlaw","url":"https://i.imgur.com/srRIAOO.png"},{"name":"excalibur","url":"https://i.imgur.com/seS3Lws.png"},{"name":"king-lion","url":"https://i.imgur.com/N0HfHgG.png"},{"name":"magic-hat","url":"https://i.imgur.com/GbSv8pX.png"},{"name":"jotun","url":"https://i.imgur.com/RvCOiST.png"},{"name":"champion","url":"https://i.imgur.com/NhSkYyJ.png"},{"name":"bad-boy","url":"https://i.imgur.com/ZiCSwc1.png"},{"name":"soloist","url":"https://i.imgur.com/iBaFIts.png"},{"name":"superstar","url":"https://i.imgur.com/9Sly7ba.png"},{"name":"metal-face","url":"https://i.imgur.com/IN8goc6.png"},{"name":"icon","url":"https://i.imgur.com/TZTeBdZ.png"},{"name":"mico","url":"https://i.imgur.com/9Yi5oNG.png"},{"name":"toco","url":"https://i.imgur.com/qUI8XPO.png"},{"name":"eagle","url":"https://i.imgur.com/Lnk9VJf.png"},{"name":"liberty","url":"https://i.imgur.com/mlI8vFt.png"},{"name":"bunny","url":"https://i.imgur.com/yYhKqqL.png"},{"name":"hazmat","url":"https://i.imgur.com/ePHwwWF.png"},{"name":"ooze","url":"https://i.imgur.com/z01qUGv.png"},{"name":"husky-brawl","url":"https://i.imgur.com/TN3OwY3.png"},{"name":"kempo-tiger","url":"https://i.imgur.com/ZrLoLEj.png"},{"name":"frog-thai","url":"https://i.imgur.com/0fq8vIJ.png"},{"name":"karate-parrot","url":"https://i.imgur.com/hmM3qk1.png"},{"name":"raccoon-jutsu","url":"https://i.imgur.com/gDB3zn8.png"},{"name":"dr.-cosmos","url":"https://i.imgur.com/RlvFRTr.png"},{"name":"omega-blast","url":"https://i.imgur.com/r1RtmOG.png"},{"name":"scar","url":"https://i.imgur.com/ncF9xxx.png"},{"name":"seer","url":"https://i.imgur.com/4ogKizr.png"},{"name":"wicked-cat","url":"https://i.imgur.com/38G0knt.png"},{"name":"sea-explorer","url":"https://i.imgur.com/1dEVf9m.png"},{"name":"squiggly","url":"https://i.imgur.com/RBHkReN.png"},{"name":"croc","url":"https://i.imgur.com/WWuaBJu.png"},{"name":"poison-rose","url":"https://i.imgur.com/KyTOB6v.png"},{"name":"calaca","url":"https://i.imgur.com/d4sOsdH.png"},{"name":"pinhata","url":"https://i.imgur.com/3Ngkn6P.png"},{"name":"happy","url":"https://i.imgur.com/UyHWQ2t.png"},{"name":"bread","url":"https://i.imgur.com/1nahAhh.png"},{"name":"pug","url":"https://i.imgur.com/sgELDjI.png"},{"name":"colossus","url":"https://i.imgur.com/3YWBWTK.png"},{"name":"dark-matter","url":"https://i.imgur.com/2DRbY3l.png"},{"name":"thanksgiving-turkey","url":"https://i.imgur.com/ERMNFrj.png"},{"name":"thanksgiving-pumpkin","url":"https://i.imgur.com/Onmzl5T.png"},{"name":"sly","url":"https://i.imgur.com/uMWNXfg.png"},{"name":"faun","url":"https://i.imgur.com/soEBBWa.png"},{"name":"chicken-leg","url":"https://i.imgur.com/TZO1R6y.png"},{"name":"termite","url":"https://i.imgur.com/ByeMjRU.png"},{"name":"eyeball","url":"https://i.imgur.com/VdxpIEC.png"},{"name":"nuke","url":"https://i.imgur.com/q6Qdzhe.png"},{"name":"raider","url":"https://i.imgur.com/jRgEuMy.png"},{"name":"jumper","url":"https://i.imgur.com/7BRFa83.png"},{"name":"blue-swirl","url":"https://i.imgur.com/EWNqlbL.png"},{"name":"aries","url":"https://i.imgur.com/uviaMqv.png"},{"name":"taurus","url":"https://i.imgur.com/VlUGVRa.png"},{"name":"gemini","url":"https://i.imgur.com/aK6vpqP.png"},{"name":"cancer","url":"https://i.imgur.com/TOuceEx.png"},{"name":"frankenstein","url":"https://i.imgur.com/hOWLW0Q.png"},{"name":"pumpkin","url":"https://i.imgur.com/9jtb433.png"},{"name":"mad-monkey","url":"https://i.imgur.com/YlqyCHu.png"},{"name":"cannon-ball","url":"https://i.imgur.com/NZBfOKe.png"},{"name":"evil-master","url":"https://i.imgur.com/ljnAgVh.png"},{"name":"space-warden","url":"https://i.imgur.com/uhnbzGG.png"},{"name":"polar-bear","url":"https://i.imgur.com/RJgf1U9.png"},{"name":"penguin","url":"https://i.imgur.com/qXA3ZMj.png"},{"name":"flying-cork","url":"https://i.imgur.com/YWLdNRT.png"},{"name":"happy-soda","url":"https://i.imgur.com/WkV8Gzx.png"},{"name":"time-dude","url":"https://i.imgur.com/0waO0hQ.png"},{"name":"time-doctor","url":"https://i.imgur.com/VZQkmPP.png"},{"name":"basketball","url":"https://i.imgur.com/GP04Oa6.png"},{"name":"ping-pong","url":"https://i.imgur.com/RJlfbMg.png"},{"name":"coil","url":"https://i.imgur.com/4NW9VN2.png"},{"name":"ziggy","url":"https://i.imgur.com/DizfhBO.png"},{"name":"amphibian","url":"https://i.imgur.com/3I6Mdn0.png"},{"name":"the-faun","url":"https://i.imgur.com/DM4Tddm.png"},{"name":"harpy","url":"https://i.imgur.com/ON7bosS.png"},{"name":"pinata-warden","url":"https://i.imgur.com/R0YFhmt.png"},{"name":"cake-master","url":"https://i.imgur.com/9BQplIW.png"},{"name":"derpy-dilophosaurus","url":"https://i.imgur.com/pjm4bUc.png"},{"name":"derpy-triceratops","url":"https://i.imgur.com/eX97qip.png"},{"name":"derpy-parasaurolophus","url":"https://i.imgur.com/sWkYYto.png"},{"name":"last-judgment","url":"https://i.imgur.com/is7egTt.png"},{"name":"reckoning","url":"https://i.imgur.com/xVEdvrg.png"},{"name":"world-end","url":"https://i.imgur.com/crcaOP9.png"},{"name":"doomsday","url":"https://i.imgur.com/rC6Ufoz.png"},{"name":"chromatic-peafowl","url":"https://i.imgur.com/KRICAEl.png"},{"name":"iridian-tiger","url":"https://i.imgur.com/z6T4LMT.png"},{"name":"simian-spectrum","url":"https://i.imgur.com/36WtnHa.png"},{"name":"walko","url":"https://i.imgur.com/CbiYDH6.png"},{"name":"tranqeeze","url":"https://i.imgur.com/dQX7NGN.png"},{"name":"sliptoon","url":"https://i.imgur.com/bnDTXFe.png"},{"name":"gotxu","url":"https://i.imgur.com/tzbQXVc.png"},{"name":"poppyns","url":"https://i.imgur.com/d1IfhTa.png"},{"name":"dj-stice","url":"https://i.imgur.com/gYebZK8.png"},{"name":"mad-ramon","url":"https://i.imgur.com/GoZKVAu.png"},{"name":"frenzy","url":"https://i.imgur.com/uRBICrW.png"},{"name":"gobbler","url":"https://i.imgur.com/KF8ei0n.png"},{"name":"creepy-cracker","url":"https://i.imgur.com/mLzMR0I.png"},{"name":"skelly","url":"https://i.imgur.com/2AeKCIx.png"},{"name":"wendy-axe","url":"https://i.imgur.com/qckeD5J.png"},{"name":"the-grin","url":"https://i.imgur.com/h2Ug7A0.png"},{"name":"zapnaut","url":"https://i.imgur.com/fEpzwZr.png"},{"name":"borggy","url":"https://i.imgur.com/LsXYgfu.png"},{"name":"leodroid","url":"https://i.imgur.com/Vxa0kQs.png"},{"name":"nightfury","url":"https://i.imgur.com/mePvwiT.png"},{"name":"black-dragon","url":"https://i.imgur.com/wYMKdHJ.png"},{"name":"skullberry","url":"https://i.imgur.com/Sv9we8b.png"},{"name":"krakenuts","url":"https://i.imgur.com/bmlnGHm.png"},{"name":"ghosties","url":"https://i.imgur.com/mIQaiji.png"},{"name":"pumpkitty","url":"https://i.imgur.com/tyWtoO9.png"},{"name":"hello-reaper","url":"https://i.imgur.com/pabeGHs.png"},{"name":"hunterz","url":"https://i.imgur.com/4BdjsLF.png"},{"name":"baldman","url":"https://i.imgur.com/0wMiBNY.png"},{"name":"brooklyn","url":"https://i.imgur.com/Gumk5xO.png"},{"name":"jaja","url":"https://i.imgur.com/Bibit00.png"},{"name":"elbillion","url":"https://i.imgur.com/F8mEmJA.png"},{"name":"sunkey","url":"https://i.imgur.com/Zgsz5yU.png"},{"name":"sir-bonesy","url":"https://i.imgur.com/amHNu6W.png"},{"name":"mr-banana","url":"https://i.imgur.com/9HRvT0h.png"},{"name":"red-hot-watermelon","url":"https://i.imgur.com/emHGx6M.png"},{"name":"angies-sammish","url":"https://i.imgur.com/yxLlMob.png"},{"name":"gahhhlic","url":"https://i.imgur.com/hmftEbS.png"},{"name":"tjoops","url":"https://i.imgur.com/HK9cjB5.png"},{"name":"frankie-tomankie","url":"https://i.imgur.com/4eyIzF0.png"},{"name":"stretch-dog","url":"https://i.imgur.com/g6valrm.png"},{"name":"bad-bone","url":"https://i.imgur.com/lfOn0Tn.png"},{"name":"swag-royalty","url":"https://i.imgur.com/xxBXFXm.png"},{"name":"baddie","url":"https://i.imgur.com/wMCXYak.png"},{"name":"chilled-homie","url":"https://i.imgur.com/CN5AxRb.png"},{"name":"bunnytron","url":"https://i.imgur.com/HcVei1U.png"},{"name":"electro-chick","url":"https://i.imgur.com/7QmhgzR.png"},{"name":"cyborg-clown","url":"https://i.imgur.com/4qN9pzH.png"},{"name":"rainbow-slap","url":"https://i.imgur.com/ov8K6yj.png"},{"name":"purple-hacker","url":"https://i.imgur.com/WKkLWFt.png"},{"name":"color-runner","url":"https://i.imgur.com/QZsBov5.png"},{"name":"masked-menace","url":"https://i.imgur.com/V8VgNox.png"},{"name":"eleanor-of-light","url":"https://i.imgur.com/VLqtJ9Z.png"},{"name":"frankie","url":"https://i.imgur.com/O7JnOAY.png"},{"name":"blobby-boy","url":"https://i.imgur.com/8nNmeYY.png"},{"name":"dracool","url":"https://i.imgur.com/Fde7GFS.png"},{"name":"wisgarus-dragonslayer","url":"https://i.imgur.com/LsWb2zD.png"},{"name":"ironfist-titus","url":"https://i.imgur.com/BjBAsRy.png"},{"name":"araneaphyx","url":"https://i.imgur.com/GOHGsMm.png"},{"name":"necro-strangler","url":"https://i.imgur.com/kqyBjA2.png"},{"name":"spectral-owl","url":"https://i.imgur.com/Kb8nx21.png"},{"name":"fire-golem","url":"https://i.imgur.com/iEKLZnX.png"},{"name":"cursed-samurai","url":"https://i.imgur.com/6l7YDm3.png"},{"name":"mr.-strange","url":"https://i.imgur.com/OSCJcKb.png"},{"name":"mr.-puzzled","url":"https://i.imgur.com/ZZkTItA.png"},{"name":"mr.-charming","url":"https://i.imgur.com/SgcVKrW.png"},{"name":"zula-gorgan","url":"https://i.imgur.com/2X440TW.png"},{"name":"goddess-aona","url":"https://i.imgur.com/0DP74cc.png"},{"name":"leech","url":"https://i.imgur.com/OVeaVlJ.png"},{"name":"metal-scorpion","url":"https://i.imgur.com/kqVGyFT.png"},{"name":"fallen-one","url":"https://i.imgur.com/F7PJ7OD.png"},{"name":"midnight-yeti","url":"https://i.imgur.com/CpJG0d3.png"},{"name":"defiled-scarecrow","url":"https://i.imgur.com/hU6p5Wr.png"},{"name":"guinea-pig","url":"https://i.imgur.com/EV2hQnW.png"},{"name":"bad-pigeon","url":"https://i.imgur.com/MpaTxMM.png"},{"name":"awkward","url":"https://i.imgur.com/VQro9NJ.png"},{"name":"princess-swift","url":"https://i.imgur.com/8V1NAfa.png"},{"name":"dark-sorceress","url":"https://i.imgur.com/rwh3tOP.png"},{"name":"neptunus-spider","url":"https://i.imgur.com/5CaPRCb.png"},{"name":"mutant-herb","url":"https://i.imgur.com/AvlN50L.png"},{"name":"death-mouse","url":"https://i.imgur.com/bg9s01W.png"},{"name":"killer-mask","url":"https://i.imgur.com/BxFfglZ.png"},{"name":"egyptian-plague","url":"https://i.imgur.com/DhCawb3.png"},{"name":"grumpy-frog","url":"https://i.imgur.com/O5JUYcB.png"},{"name":"tooth-troll","url":"https://i.imgur.com/6JkvY3x.png"},{"name":"birthosaur","url":"https://i.imgur.com/qInFwqA.png"},{"name":"ice-griffin","url":"https://i.imgur.com/ILI2Llu.png"},{"name":"golden-axe","url":"https://i.imgur.com/3DlfxFz.png"},{"name":"demonic-helmet","url":"https://i.imgur.com/C0GwMG6.png"},{"name":"heavy-metal","url":"https://i.imgur.com/BqzfFUI.png"},{"name":"prankster","url":"https://i.imgur.com/56kWPrJ.png"},{"name":"wacky-hyena","url":"https://i.imgur.com/UxqEL7L.png"},{"name":"lead","url":"https://i.imgur.com/FS6m8uS.png"},{"name":"wolf-paw","url":"https://i.imgur.com/4Ck4h07.png"},{"name":"helmet","url":"https://i.imgur.com/ZgWtc3A.png"},{"name":"surprised-cat","url":"https://i.imgur.com/JhdMKrt.png"},{"name":"idea","url":"https://i.imgur.com/1FgkXR2.png"},{"name":"clever","url":"https://i.imgur.com/tzY8inN.png"},{"name":"omega","url":"https://i.imgur.com/YnAq4yg.png"},{"name":"frost-hand","url":"https://i.imgur.com/LGCKJ9G.png"},{"name":"radical-smile","url":"https://i.imgur.com/LIkrfaW.png"},{"name":"theorist","url":"https://i.imgur.com/PKaFLnx.png"},{"name":"grandma","url":"https://i.imgur.com/1MrdgRM.png"},{"name":"chirpy-raptor","url":"https://i.imgur.com/fF90GSm.png"},{"name":"wolf-sigil","url":"https://i.imgur.com/FSOxpln.png"},{"name":"eternal-snake","url":"https://i.imgur.com/nIeLnp7.png"},{"name":"pyramid-eye","url":"https://i.imgur.com/xp1fNp8.png"},{"name":"tea-time","url":"https://i.imgur.com/GG1FkrO.png"},{"name":"necktie-cat","url":"https://i.imgur.com/T4kHy1h.png"},{"name":"big-eyes","url":"https://i.imgur.com/Tw9iFuw.png"},{"name":"flying-saucer","url":"https://i.imgur.com/jMcqXsI.png"},{"name":"infernus","url":"https://i.imgur.com/doKLt6X.png"},{"name":"shadow-man","url":"https://i.imgur.com/HlznNn0.png"},{"name":"circle","url":"https://i.imgur.com/a6tt6N1.png"},{"name":"cool-guy","url":"https://i.imgur.com/8pb7ZEE.png"},{"name":"furious","url":"https://i.imgur.com/userRjQ.png"},{"name":"nice-doggy","url":"https://i.imgur.com/G0wZPJ4.png"},{"name":"cave-troll","url":"https://i.imgur.com/FruZaeU.png"},{"name":"crazy-eye","url":"https://i.imgur.com/M4V0KQW.png"},{"name":"walrus-art","url":"https://i.imgur.com/1iofFr2.png"},{"name":"cave-painting","url":"https://i.imgur.com/liVQaBl.png"},{"name":"future-art","url":"https://i.imgur.com/ZyyeJOO.png"},{"name":"pencil","url":"https://i.imgur.com/xPDoekh.png"},{"name":"splatter","url":"https://i.imgur.com/IqYiFCp.png"},{"name":"gouache","url":"https://i.imgur.com/UsTe4I5.png"},{"name":"space-warrior","url":"https://i.imgur.com/GOSzlma.png"},{"name":"roller-bot","url":"https://i.imgur.com/DccIHLd.png"},{"name":"duel-master","url":"https://i.imgur.com/WHYroBz.png"},{"name":"mad-cap","url":"https://i.imgur.com/LPmRBIC.png"},{"name":"raspy-elf","url":"https://i.imgur.com/LbXRoYb.png"},{"name":"zany-tree","url":"https://i.imgur.com/TEO3VfB.png"},{"name":"the-gaunt","url":"https://i.imgur.com/h65hjsL.png"},{"name":"the-miasma","url":"https://i.imgur.com/sCybfdV.png"},{"name":"the-scorcher","url":"https://i.imgur.com/aY3Cmms.png"},{"name":"the-reaper","url":"https://i.imgur.com/XrPAW5v.png"},{"name":"ringmaster","url":"https://i.imgur.com/VoOXEVb.png"},{"name":"burly-man","url":"https://i.imgur.com/D1Zp89b.png"},{"name":"firespitter","url":"https://i.imgur.com/R2ytL3y.png"},{"name":"the-oracle","url":"https://i.imgur.com/HIZ6SNE.png"},{"name":"snowboarder","url":"https://i.imgur.com/Rb30bPg.png"},{"name":"white-owl","url":"https://i.imgur.com/DXtyHWQ.png"},{"name":"goofy-yeti","url":"https://i.imgur.com/sknxfHY.png"},{"name":"mega-mecha","url":"https://i.imgur.com/F7CLJ3f.png"},{"name":"spinner-kid","url":"https://i.imgur.com/MyYCQVC.png"},{"name":"bolt-samurai","url":"https://i.imgur.com/x5p7NyM.png"},{"name":"metal-ghoul","url":"https://i.imgur.com/plr9hgS.png"},{"name":"psycho","url":"https://i.imgur.com/5h0Cljf.png"},{"name":"banshee","url":"https://i.imgur.com/cFumf3w.png"},{"name":"shogun","url":"https://i.imgur.com/dJ5tz4f.png"},{"name":"elder-master","url":"https://i.imgur.com/7suHW51.png"},{"name":"geisha","url":"https://i.imgur.com/mGpVsP4.png"},{"name":"dr-static","url":"https://i.imgur.com/1N8Fs8I.png"},{"name":"cogs","url":"https://i.imgur.com/fY3vQ3f.png"},{"name":"steam-freak","url":"https://i.imgur.com/wAQYs6B.png"},{"name":"ankh","url":"https://i.imgur.com/YlM2buQ.png"},{"name":"cleopatra","url":"https://i.imgur.com/eRtkTgH.png"},{"name":"egyptian-cat","url":"https://i.imgur.com/Epy8Aih.png"},{"name":"pharaoh","url":"https://i.imgur.com/w6jH0b0.png"},{"name":"dragon-griffin","url":"https://i.imgur.com/l6Vvt58.png"},{"name":"dragon-twin","url":"https://i.imgur.com/YceD6dk.png"},{"name":"dragon-hydra","url":"https://i.imgur.com/yW8HZxY.png"},{"name":"zap","url":"https://i.imgur.com/bUknQtX.png"},{"name":"silent-fox","url":"https://i.imgur.com/KquYlRP.png"},{"name":"insectoid","url":"https://i.imgur.com/s1cK8Hi.png"},{"name":"hercules","url":"https://i.imgur.com/ZwM54ht.png"},{"name":"poseidon","url":"https://i.imgur.com/RYxRzNF.png"},{"name":"medusa","url":"https://i.imgur.com/73Dy76l.png"},{"name":"gold-coin","url":"https://i.imgur.com/4wcQ3UB.png"},{"name":"super-car","url":"https://i.imgur.com/cVbyqdG.png"},{"name":"war-tank","url":"https://i.imgur.com/XhkrEqG.png"},{"name":"rogue","url":"https://i.imgur.com/R58bSWg.png"},{"name":"archer","url":"https://i.imgur.com/duxazey.png"},{"name":"paladin","url":"https://i.imgur.com/fipk64S.png"},{"name":"mage","url":"https://i.imgur.com/LpqPZTK.png"},{"name":"dry-face","url":"https://i.imgur.com/TfFHrEU.png"},{"name":"crazy-brain","url":"https://i.imgur.com/yZUeNbk.png"},{"name":"zombie-dog","url":"https://i.imgur.com/emmTTmB.png"},{"name":"sweaty","url":"https://i.imgur.com/6fPJTMX.png"},{"name":"wicked","url":"https://i.imgur.com/qNbfeKp.png"},{"name":"full","url":"https://i.imgur.com/UaXpgMo.png"},{"name":"tough","url":"https://i.imgur.com/7fIjKQK.png"},{"name":"mischievous","url":"https://i.imgur.com/BrbGk4I.png"},{"name":"queasy","url":"https://i.imgur.com/HL6c0k2.png"},{"name":"lovesick","url":"https://i.imgur.com/Lff8W5r.png"},{"name":"sad","url":"https://i.imgur.com/D4TYppW.png"},{"name":"bitter","url":"https://i.imgur.com/GHTH0LA.png"},{"name":"amazed","url":"https://i.imgur.com/Cw9oVSH.png"},{"name":"helm","url":"https://i.imgur.com/7DZ4zxJ.png"},{"name":"gladiatrix","url":"https://i.imgur.com/lCxLXWI.png"},{"name":"reptilian","url":"https://i.imgur.com/ZpA7kBq.png"},{"name":"star-eagle","url":"https://i.imgur.com/wlD2Ssn.png"},{"name":"celebration-hat","url":"https://i.imgur.com/mD1lsWg.png"},{"name":"mr.-boss","url":"https://i.imgur.com/HFW9Voc.png"},{"name":"sonic-boom","url":"https://i.imgur.com/ehIWvmh.png"},{"name":"cyber-scarab","url":"https://i.imgur.com/ruPL8kp.png"},{"name":"haste","url":"https://i.imgur.com/mh18sMm.png"},{"name":"psycho-driller","url":"https://i.imgur.com/qQQp83n.png"},{"name":"apocalypse-rider","url":"https://i.imgur.com/I7tptlQ.png"},{"name":"eclipse-hunter","url":"https://i.imgur.com/2bRwXVI.png"},{"name":"universal-ranger","url":"https://i.imgur.com/DVCuiW0.png"},{"name":"jellyfish-ball","url":"https://i.imgur.com/nOVVpWq.png"},{"name":"walrus-ball","url":"https://i.imgur.com/FV9xHRi.png"},{"name":"bat-ball","url":"https://i.imgur.com/1f3CXQh.png"},{"name":"wacky-hero","url":"https://i.imgur.com/KocL4Eh.png"},{"name":"fallen","url":"https://i.imgur.com/hcajodk.png"},{"name":"power-girl","url":"https://i.imgur.com/oIz0EW6.png"},{"name":"sabertooth","url":"https://i.imgur.com/NiMD6m6.png"},{"name":"silver-tusk","url":"https://i.imgur.com/pQ0WuZQ.png"},{"name":"primal","url":"https://i.imgur.com/e5Bg3dZ.png"},{"name":"starfighter","url":"https://i.imgur.com/1Bt5RQf.png"},{"name":"power-badger","url":"https://i.imgur.com/NGJDTWa.png"},{"name":"alien-tree","url":"https://i.imgur.com/CPtFW0u.png"},{"name":"funny-face","url":"https://i.imgur.com/Z7OQD3N.png"},{"name":"air-bag","url":"https://i.imgur.com/ZoEBrer.png"},{"name":"smelly","url":"https://i.imgur.com/ryZGUNx.png"},{"name":"cat-cauldron","url":"https://i.imgur.com/Uz8itAT.png"},{"name":"seal-knight","url":"https://i.imgur.com/xycw94c.png"},{"name":"mystic-bird","url":"https://i.imgur.com/6RpAwFh.png"},{"name":"horse-boot","url":"https://i.imgur.com/BrhGhR1.png"},{"name":"happy-hat","url":"https://i.imgur.com/QG41QfD.png"},{"name":"bad-clover","url":"https://i.imgur.com/k45tIui.png"},{"name":"huntsman","url":"https://i.imgur.com/ZT9TQka.png"},{"name":"war-paint","url":"https://i.imgur.com/gtGlPlY.png"},{"name":"behemoth","url":"https://i.imgur.com/Z9ZM4i2.png"},{"name":"performer","url":"https://i.imgur.com/b5KNJGm.png"},{"name":"diva","url":"https://i.imgur.com/pNfWFTG.png"},{"name":"songsmith","url":"https://i.imgur.com/dfvuLU6.png"},{"name":"palm-tree","url":"https://i.imgur.com/oAuQlYn.png"},{"name":"samba","url":"https://i.imgur.com/AA1SwzG.png"},{"name":"mountain","url":"https://i.imgur.com/wpKlDaX.png"},{"name":"thief","url":"https://i.imgur.com/TSXl43F.png"},{"name":"sheriff","url":"https://i.imgur.com/ynOOuYa.png"},{"name":"king","url":"https://i.imgur.com/vc8q0C6.png"},{"name":"heartbreaker","url":"https://i.imgur.com/REDMA8q.png"},{"name":"virtuoso","url":"https://i.imgur.com/CdjeRow.png"},{"name":"rocker","url":"https://i.imgur.com/WhzMIXi.png"},{"name":"idol","url":"https://i.imgur.com/l5IiPi2.png"},{"name":"poet","url":"https://i.imgur.com/oeSG5he.png"},{"name":"carp","url":"https://i.imgur.com/52RQDLM.png"},{"name":"china-dragon","url":"https://i.imgur.com/2My9AFE.png"},{"name":"dumpling","url":"https://i.imgur.com/0cXGWcw.png"},{"name":"duck-target","url":"https://i.imgur.com/liMzX1l.png"},{"name":"bubblesaurus","url":"https://i.imgur.com/r3CvV2M.png"},{"name":"dynamite-guy","url":"https://i.imgur.com/nBuZrLl.png"},{"name":"neon-bug","url":"https://i.imgur.com/aQJSMf0.png"},{"name":"best-friends","url":"https://i.imgur.com/dvDYU5Q.png"},{"name":"chrono-ranger","url":"https://i.imgur.com/vTLcWTy.png"},{"name":"cool-agent","url":"https://i.imgur.com/LqTloOy.png"},{"name":"bruiser-goat","url":"https://i.imgur.com/WGlyWXK.png"},{"name":"rogue-bunny","url":"https://i.imgur.com/fUa3zvv.png"},{"name":"rhino-boxer","url":"https://i.imgur.com/2aknWVk.png"},{"name":"street-bull","url":"https://i.imgur.com/ySau5vh.png"},{"name":"reindeer","url":"https://i.imgur.com/g500h0b.png"},{"name":"elf-helper","url":"https://i.imgur.com/L2ufEqj.png"},{"name":"santa-claus","url":"https://i.imgur.com/nYDKF4s.png"},{"name":"cyber-guard","url":"https://i.imgur.com/qGO3o8l.png"},{"name":"star-pilot","url":"https://i.imgur.com/doxOdty.png"},{"name":"cosmo-pirate","url":"https://i.imgur.com/GUynPuX.png"},{"name":"moon-ship","url":"https://i.imgur.com/RE70CTs.png"},{"name":"root-gnome","url":"https://i.imgur.com/e2LTwJn.png"},{"name":"hobgoblin","url":"https://i.imgur.com/l1YMeLK.png"},{"name":"pixie","url":"https://i.imgur.com/dRdWPJT.png"},{"name":"basilisk","url":"https://i.imgur.com/9EcKbXx.png"},{"name":"firebird","url":"https://i.imgur.com/AuY844f.png"},{"name":"magic-gerbil","url":"https://i.imgur.com/RhyiAae.png"},{"name":"winter-wolf","url":"https://i.imgur.com/JDG38rw.png"},{"name":"viking","url":"https://i.imgur.com/kWjdSOf.png"},{"name":"icy-braid","url":"https://i.imgur.com/iWRLysc.png"},{"name":"berserker","url":"https://i.imgur.com/NPsRk8o.png"},{"name":"pie-slice","url":"https://i.imgur.com/JzVslnr.png"},{"name":"pilgrim","url":"https://i.imgur.com/XkZJDoO.png"},{"name":"virginia","url":"https://i.imgur.com/jcspdSH.png"},{"name":"terra","url":"https://i.imgur.com/5Rs3X3M.png"},{"name":"aqua","url":"https://i.imgur.com/3Gr5kvB.png"},{"name":"aer","url":"https://i.imgur.com/v6aRSyL.png"},{"name":"ignis","url":"https://i.imgur.com/8OZVCRH.png"},{"name":"major-eagle","url":"https://i.imgur.com/Z7jmcVr.png"},{"name":"x-ray","url":"https://i.imgur.com/dlOCH7y.png"},{"name":"the-tiger","url":"https://i.imgur.com/JPlaBB7.png"},{"name":"star-sentinel","url":"https://i.imgur.com/9VQpDef.png"},{"name":"iron-titan","url":"https://i.imgur.com/STvCFGw.png"},{"name":"cyber-kid","url":"https://i.imgur.com/7Sbl1mL.png"},{"name":"masked","url":"https://i.imgur.com/dcSGV8l.png"},{"name":"skull-cactus","url":"https://i.imgur.com/ewdECU2.png"},{"name":"skeleton","url":"https://i.imgur.com/KU4Dd0T.png"},{"name":"infernando","url":"https://i.imgur.com/EvugQlC.png"},{"name":"calavera","url":"https://i.imgur.com/GboFHdE.png"},{"name":"phantom","url":"https://i.imgur.com/gXh01Jo.png"},{"name":"mummy","url":"https://i.imgur.com/N73BOVk.png"},{"name":"undead","url":"https://i.imgur.com/vEbba8p.png"},{"name":"werewolf","url":"https://i.imgur.com/CKCuJVj.png"},{"name":"vampire","url":"https://i.imgur.com/CPj5BaN.png"},{"name":"toxic-eater","url":"https://i.imgur.com/a9F26u3.png"},{"name":"ogre","url":"https://i.imgur.com/ikOrSKQ.png"},{"name":"scavenger","url":"https://i.imgur.com/xv5KqrK.png"},{"name":"marauder","url":"https://i.imgur.com/TCM0WvX.png"},{"name":"mutant","url":"https://i.imgur.com/ewc7tQO.png"},{"name":"viper","url":"https://i.imgur.com/MSF6OeB.png"},{"name":"biker","url":"https://i.imgur.com/IO7LKjl.png"},{"name":"desert-fox","url":"https://i.imgur.com/0F20pA0.png"},{"name":"ranger","url":"https://i.imgur.com/xVgR3P6.png"},{"name":"devourer","url":"https://i.imgur.com/y420aoi.png"},{"name":"pine-head","url":"https://i.imgur.com/RR4qfDn.png"},{"name":"sea-turtle","url":"https://i.imgur.com/3dQWsNG.png"},{"name":"volcano","url":"https://i.imgur.com/URC73yO.png"},{"name":"coco-nuts","url":"https://i.imgur.com/5wgDfEm.png"},{"name":"warrior","url":"https://i.imgur.com/oKbh3ZP.png"},{"name":"acorn","url":"https://i.imgur.com/VeE0Pf4.png"},{"name":"squirrel","url":"https://i.imgur.com/yJmToqW.png"},{"name":"maple","url":"https://i.imgur.com/kV7TWsN.png"},{"name":"badger","url":"https://i.imgur.com/M0dyUQb.png"},{"name":"prey","url":"https://i.imgur.com/SDaPSPZ.png"},{"name":"white-horse","url":"https://i.imgur.com/f1HUwHk.png"},{"name":"monk","url":"https://i.imgur.com/I7TmSo9.png"},{"name":"water-spirit","url":"https://i.imgur.com/PBtLHtf.png"},{"name":"boar","url":"https://i.imgur.com/tUPupoG.png"},{"name":"kong","url":"https://i.imgur.com/gsatHqE.png"},{"name":"gamma","url":"https://i.imgur.com/VHAgwT6.png"},{"name":"neila","url":"https://i.imgur.com/jbQ4k8N.png"},{"name":"omicron","url":"https://i.imgur.com/OdkoSYW.png"},{"name":"vega","url":"https://i.imgur.com/iLztrld.png"},{"name":"smyg","url":"https://i.imgur.com/NmfDsN8.png"},{"name":"bullseye","url":"https://i.imgur.com/I06EhVo.png"},{"name":"touché","url":"https://i.imgur.com/aQpatrr.png"},{"name":"jab","url":"https://i.imgur.com/73dpBYk.png"},{"name":"backswing","url":"https://i.imgur.com/ux9gCfa.png"},{"name":"spike","url":"https://i.imgur.com/KImuNlG.png"},{"name":"parrot","url":"https://i.imgur.com/i2UaIe2.png"},{"name":"rascal","url":"https://i.imgur.com/BgdJ39i.png"},{"name":"pirate-maiden","url":"https://i.imgur.com/jzOjqbO.png"},{"name":"captain-skull","url":"https://i.imgur.com/GrzWzKP.png"},{"name":"black-beard","url":"https://i.imgur.com/XEWiR8h.png"},{"name":"tennist","url":"https://i.imgur.com/QEwNh2E.png"},{"name":"gymnast","url":"https://i.imgur.com/Gj3znPN.png"},{"name":"judo-fighter","url":"https://i.imgur.com/oJlDnUI.png"},{"name":"swimmer","url":"https://i.imgur.com/Ul28maB.png"},{"name":"sprinter","url":"https://i.imgur.com/gPxO0RK.png"},{"name":"hot-coffee","url":"https://i.imgur.com/iaUJjgg.png"},{"name":"soda-can","url":"https://i.imgur.com/nQKPtc7.png"},{"name":"jelly-face","url":"https://i.imgur.com/OqBfmJB.png"},{"name":"fries","url":"https://i.imgur.com/Mn66vSO.png"},{"name":"burger-face","url":"https://i.imgur.com/aCq6V1B.png"},{"name":"birthday-sanik","url":"https://i.imgur.com/4FMW4RY.png"},{"name":"birthday-wojak","url":"https://i.imgur.com/GdfC9zB.png"},{"name":"birthday-cia","url":"https://i.imgur.com/QFf7WW2.png"},{"name":"birthday-sir","url":"https://i.imgur.com/G1MYW8s.png"},{"name":"birthday-doge","url":"https://i.imgur.com/HH9iXKl.png"},{"name":"sunbath","url":"https://i.imgur.com/qnS6IBB.png"},{"name":"watermelon","url":"https://i.imgur.com/Ry3G8y2.png"},{"name":"starfish","url":"https://i.imgur.com/WJF3QBm.png"},{"name":"ice-cream","url":"https://i.imgur.com/CUx3syj.png"},{"name":"surfer","url":"https://i.imgur.com/484e4CE.png"},{"name":"crazy-ball","url":"https://i.imgur.com/7c6t7rV.png"},{"name":"skyrocket","url":"https://i.imgur.com/RiNuYkV.png"},{"name":"stars-and-stripes","url":"https://i.imgur.com/wDWen83.png"},{"name":"migthy","url":"https://i.imgur.com/Gsudy1p.png"},{"name":"uncle-sam","url":"https://i.imgur.com/qyiOZso.png"},{"name":"soccer-ball","url":"https://i.imgur.com/txyp61n.png"},{"name":"kepper","url":"https://i.imgur.com/ddCiaiO.png"},{"name":"soccer-boot","url":"https://i.imgur.com/pFAnazm.png"},{"name":"striker","url":"https://i.imgur.com/FwRwjeM.png"},{"name":"star-player","url":"https://i.imgur.com/wO0Uodi.png"},{"name":"green-man","url":"https://i.imgur.com/HNMU6DS.png"},{"name":"slime-face","url":"https://i.imgur.com/zHJNseK.png"},{"name":"blob","url":"https://i.imgur.com/rAcoXvC.png"},{"name":"invader","url":"https://i.imgur.com/vQ3XVKC.png"},{"name":"space-hunter","url":"https://i.imgur.com/9hf4aIi.png"},{"name":"thirteen","url":"https://i.imgur.com/MPKAQH2.png"},{"name":"raven","url":"https://i.imgur.com/ILvGajF.png"},{"name":"black-cat","url":"https://i.imgur.com/K7Jspyy.png"},{"name":"mask","url":"https://i.imgur.com/6QccB2D.png"},{"name":"goblin","url":"https://i.imgur.com/E8LIKwL.png"},{"name":"chihuahua","url":"https://i.imgur.com/S4GnZVt.png"},{"name":"cactus","url":"https://i.imgur.com/FnCg7yN.png"},{"name":"sombrero","url":"https://i.imgur.com/ICszo9k.png"},{"name":"hot-pepper","url":"https://i.imgur.com/6vprpXN.png"},{"name":"jester","url":"https://i.imgur.com/P1swLRE.png"},{"name":"chupacabra","url":"https://i.imgur.com/YZXSug7.png"},{"name":"choco-egg","url":"https://i.imgur.com/upmgEO7.png"},{"name":"statue","url":"https://i.imgur.com/FgDOu0v.png"},{"name":"carrot","url":"https://i.imgur.com/jZuuzPY.png"},{"name":"rooster","url":"https://i.imgur.com/wHcPIe3.png"},{"name":"rabbit","url":"https://i.imgur.com/o1Otcz6.png"},{"name":"hat","url":"https://i.imgur.com/jPBxBEI.png"},{"name":"boot","url":"https://i.imgur.com/jUoNDHJ.png"},{"name":"horseshoe","url":"https://i.imgur.com/Ka6MDNr.png"},{"name":"lucky-clover","url":"https://i.imgur.com/JMSez7V.png"},{"name":"gold-pot","url":"https://i.imgur.com/k8rcKov.png"},{"name":"rainbow","url":"https://i.imgur.com/bLGD3C0.png"},{"name":"leprechaun","url":"https://i.imgur.com/vaL2gRi.png"},{"name":"cupcake","url":"https://i.imgur.com/2GMj75T.png"},{"name":"boy-kiss","url":"https://i.imgur.com/q8S6wuN.png"},{"name":"girl-kiss","url":"https://i.imgur.com/JsvzzjN.png"},{"name":"cupid","url":"https://i.imgur.com/jEyDpPh.png"},{"name":"gingerbread","url":"https://i.imgur.com/kQouTPZ.png"},{"name":"santa","url":"https://i.imgur.com/o6BSUnU.png"},{"name":"evil-elf","url":"https://i.imgur.com/4eqNCqn.png"},{"name":"venus","url":"https://i.imgur.com/aUzhS3K.png"},{"name":"mercury","url":"https://i.imgur.com/iOwF8IB.png"},{"name":"banana","url":"https://i.imgur.com/YzoNp6k.png"},{"name":"birdie","url":"https://i.imgur.com/4VQ2JuT.png"},{"name":"ufo","url":"https://i.imgur.com/DXs7PJi.png"},{"name":"apple","url":"https://i.imgur.com/6jDxAsk.png"},{"name":"tiger","url":"https://i.imgur.com/ZSt7heC.png"},{"name":"shuttle","url":"https://i.imgur.com/Ridedty.png"},{"name":"cookie","url":"https://i.imgur.com/YFBdGTf.png"},{"name":"jupiter","url":"https://i.imgur.com/NlTrjJ4.png"},{"name":"halo","url":"https://i.imgur.com/gJJrsBs.png"},{"name":"neptune","url":"https://i.imgur.com/qmK7MRN.png"},{"name":"black-hole","url":"https://i.imgur.com/jttebiB.png"},{"name":"uranus","url":"https://i.imgur.com/WNiYrlK.png"},{"name":"star-ball","url":"https://i.imgur.com/v0PUXGP.png"},{"name":"target","url":"https://i.imgur.com/IyYafqq.png"},{"name":"galaxy","url":"https://i.imgur.com/tkLo15U.png"},{"name":"breakfast","url":"https://i.imgur.com/sgmTspD.png"},{"name":"saturn","url":"https://i.imgur.com/sZTq0Mu.png"},{"name":"pluto","url":"https://i.imgur.com/IrtYEmL.png"},{"name":"hot-dog","url":"https://i.imgur.com/AByhhZr.png"},{"name":"heart","url":"https://i.imgur.com/iRkN8T5.png"},{"name":"mouse","url":"https://i.imgur.com/gYcXUMl.png"},{"name":"wolf","url":"https://i.imgur.com/DEnVYuv.png"},{"name":"goldfish","url":"https://i.imgur.com/YVcsAwm.png"},{"name":"rocket","url":"https://i.imgur.com/grdWuxA.png"},{"name":"piggie","url":"https://i.imgur.com/3ljBjU9.png"},{"name":"blueberry","url":"https://i.imgur.com/FMZFA21.png"},{"name":"bomb","url":"https://i.imgur.com/x7KeVge.png"},{"name":"bowling","url":"https://i.imgur.com/d4hubLO.png"},{"name":"candy","url":"https://i.imgur.com/whRXTKJ.png"},{"name":"frog","url":"https://i.imgur.com/aZtvs7t.png"},{"name":"hamburger","url":"https://i.imgur.com/nUmytKs.png"},{"name":"nose","url":"https://i.imgur.com/HiaQKQm.png"},{"name":"seal","url":"https://i.imgur.com/VO7YUeq.png"},{"name":"panda","url":"https://i.imgur.com/BT6nfyn.png"},{"name":"pizza","url":"https://i.imgur.com/i2zHRQh.png"},{"name":"snowman","url":"https://i.imgur.com/7bAhl9D.png"},{"name":"sun","url":"https://i.imgur.com/DAsySAD.png"},{"name":"baseball","url":"https://i.imgur.com/ziteMCg.png"},{"name":"basketball","url":"https://i.imgur.com/SxvawJy.png"},{"name":"bug","url":"https://i.imgur.com/ECXVy3q.png"},{"name":"cloud","url":"https://i.imgur.com/gef55od.png"},{"name":"moo","url":"https://i.imgur.com/n1ZYhQl.png"},{"name":"tomato","url":"https://i.imgur.com/tjq71dr.png"},{"name":"mushroom","url":"https://i.imgur.com/slUeHQk.png"},{"name":"donuts","url":"https://i.imgur.com/uirIOy8.png"},{"name":"terrible","url":"https://i.imgur.com/RV9Oju2.png"},{"name":"ghost","url":"https://i.imgur.com/RHp1Ppo.png"},{"name":"apple-face","url":"https://i.imgur.com/Ojbv5Uy.png"},{"name":"turtle","url":"https://i.imgur.com/qnNlCDJ.png"},{"name":"brofist","url":"https://i.imgur.com/nqCSgyk.png"},{"name":"astronaut","url":"https://i.imgur.com/Nu7B3Ye.png"},{"name":"puppy","url":"https://i.imgur.com/2r9iyrC.png"},{"name":"footprint","url":"https://i.imgur.com/BSxvO9J.png"},{"name":"meteor","url":"https://i.imgur.com/GP6fQNK.png"},{"name":"pineapple","url":"https://i.imgur.com/VQ3YahI.png"},{"name":"zebra","url":"https://i.imgur.com/7t9HrjE.png"},{"name":"toon","url":"https://i.imgur.com/sLfFV9o.png"},{"name":"octopus","url":"https://i.imgur.com/Ezc15SN.png"},{"name":"radar","url":"https://i.imgur.com/epY2Dwb.png"},{"name":"alien","url":"https://i.imgur.com/vQ3DAhT.png"},{"name":"eye","url":"https://i.imgur.com/lSvRUgn.png"},{"name":"owl","url":"https://i.imgur.com/tAN2eNz.png"},{"name":"virus","url":"https://i.imgur.com/Nm2UQJ5.png"},{"name":"smile","url":"https://i.imgur.com/bOgwF0t.png"},{"name":"army","url":"https://i.imgur.com/77Ok3yh.png"},{"name":"cat","url":"https://i.imgur.com/n14ThhL.png"},{"name":"nuclear","url":"https://i.imgur.com/9UzgP4H.png"},{"name":"toxic","url":"https://i.imgur.com/q5ffWVY.png"},{"name":"space-dog","url":"https://i.imgur.com/GegLmKo.png"},{"name":"dog","url":"https://i.imgur.com/MhmlDOH.png"},{"name":"sad","url":"https://i.imgur.com/rB0uNS1.png"},{"name":"facepalm","url":"https://i.imgur.com/77tPAQz.png"},{"name":"luchador","url":"https://i.imgur.com/WvtIDdD.png"},{"name":"zombie","url":"https://i.imgur.com/Bl3dF33.png"},{"name":"bite","url":"https://i.imgur.com/7ouQDX8.png"},{"name":"crazy","url":"https://i.imgur.com/UrIakgA.png"},{"name":"hockey","url":"https://i.imgur.com/eghonQm.png"},{"name":"brain","url":"https://i.imgur.com/U30jjyB.png"},{"name":"evil","url":"https://i.imgur.com/XzWLrfu.png"},{"name":"pirate","url":"https://i.imgur.com/Z7RCfUM.png"},{"name":"evil-eye","url":"https://i.imgur.com/EDp3GPz.png"},{"name":"halloween","url":"https://i.imgur.com/o6LhkwI.png"},{"name":"monster","url":"https://i.imgur.com/DsAcmAy.png"},{"name":"scarecrow","url":"https://i.imgur.com/wtCJzV7.png"},{"name":"spy","url":"https://i.imgur.com/Kb3YKC5.png"},{"name":"tender-heart-bear","url":"https://i.imgur.com/IeInfoc.png"},{"name":"funshine-bear","url":"https://i.imgur.com/IWNv9EE.png"},{"name":"bright-heart-racoon","url":"https://i.imgur.com/FX585v6.png"},{"name":"cozy-heart-penguin","url":"https://i.imgur.com/pwqrDgm.png"},{"name":"lotsa-heart-elephant","url":"https://i.imgur.com/Q13iWzN.png"},{"name":"brave-heart-lion","url":"https://i.imgur.com/uYUreO6.png"},{"name":"dust-brain","url":"https://i.imgur.com/0Qdh96N.png"},{"name":"oculus-orbus","url":"https://i.imgur.com/lqROHcZ.png"},{"name":"screamin'-meemie","url":"https://i.imgur.com/hYhpgPX.png"},{"name":"hornhead","url":"https://i.imgur.com/0qEDT0g.png"},{"name":"skull-face","url":"https://i.imgur.com/nHTOuop.png"},{"name":"g-shark","url":"https://i.imgur.com/OuYCv6u.png"},{"name":"homers","url":"https://i.imgur.com/7smklDb.png"},{"name":"poke-m","url":"https://i.imgur.com/7F6iIyc.png"},{"name":"sponge-b","url":"https://i.imgur.com/bMGgIGQ.png"},{"name":"angry-bird","url":"https://i.imgur.com/wOcgqZJ.png"},{"name":"spide","url":"https://i.imgur.com/c4FPjpv.png"},{"name":"hoppy","url":"https://i.imgur.com/pInPEcS.png"},{"name":"hamsome","url":"https://i.imgur.com/vCK6eBe.png"},{"name":"hummingbird","url":"https://i.imgur.com/yK3re4S.png"},{"name":"bunny-sigil","url":"https://i.imgur.com/E7yTevI.png"},{"name":"ramjet-bunny","url":"https://i.imgur.com/zkOiQa3.png"},{"name":"rabuddhist","url":"https://i.imgur.com/KttEEAC.png"},{"name":"corn-ivore","url":"https://i.imgur.com/XJcwvfj.png"},{"name":"gobble-time","url":"https://i.imgur.com/8TGFToO.png"},{"name":"mr-nice-pie","url":"https://i.imgur.com/hT7vRTJ.png"},{"name":"a-peel-ing","url":"https://i.imgur.com/G7R3zbo.png"},{"name":"who","url":"https://i.imgur.com/Tjyrzpi.png"},{"name":"wise-crow","url":"https://i.imgur.com/aZTQZZh.png"},{"name":"punk-in-pink","url":"https://i.imgur.com/bBDOcvB.png"},{"name":"flamingood","url":"https://i.imgur.com/MoqOkW9.png"},{"name":"el-pinko","url":"https://i.imgur.com/8B1pN5J.png"},{"name":"mr-oink","url":"https://i.imgur.com/n2tF0K4.png"},{"name":"axolotl","url":"https://i.imgur.com/EKGJO6Q.png"},{"name":"dinozila","url":"https://i.imgur.com/eL60toV.png"},{"name":"so-fly","url":"https://i.imgur.com/J9o3I0h.png"},{"name":"worth-it","url":"https://i.imgur.com/Np1Yxdn.png"},{"name":"be-cool","url":"https://i.imgur.com/sxRya8K.png"},{"name":"sun-shade","url":"https://i.imgur.com/EuebV8h.png"},{"name":"golden-tiger","url":"https://i.imgur.com/8Wi91bU.png"},{"name":"angry-tiger","url":"https://i.imgur.com/H1nrVOn.png"},{"name":"grrrreat-tiger","url":"https://i.imgur.com/Jeg8UYI.png"},{"name":"fire-tiger","url":"https://i.imgur.com/30ARLpM.png"},{"name":"woopheus","url":"https://i.imgur.com/S71HXMm.png"},{"name":"glitch","url":"https://i.imgur.com/wuuj8TW.png"},{"name":"replicant","url":"https://i.imgur.com/1UjU7lm.png"},{"name":"fall-spirit","url":"https://i.imgur.com/3LImYK8.png"},{"name":"timber","url":"https://i.imgur.com/J89efWG.png"},{"name":"go-nuts","url":"https://i.imgur.com/TPUfymw.png"},{"name":"mischievous-ape","url":"https://i.imgur.com/sJzEpTm.png"},{"name":"derpy-banana","url":"https://i.imgur.com/Xm4KDrU.png"},{"name":"mr-orangutan","url":"https://i.imgur.com/6p9YrjS.png"},{"name":"unga","url":"https://i.imgur.com/8jdquCA.png"},{"name":"totta","url":"https://i.imgur.com/IVfInMo.png"},{"name":"tiki-king","url":"https://i.imgur.com/KWZgvYc.png"},{"name":"cute-bunny","url":"https://i.imgur.com/O1GLWud.png"},{"name":"egg","url":"https://i.imgur.com/XlMtG6T.png"},{"name":"troublemaker-bunny","url":"https://i.imgur.com/od6AYEz.png"},{"name":"kiss","url":"https://i.imgur.com/rztbXOm.png"},{"name":"crazy-love","url":"https://i.imgur.com/TEPxJAs.png"},{"name":"lovely","url":"https://i.imgur.com/KGALCus.png"},{"name":"big-jaw","url":"https://i.imgur.com/PhbCczH.png"},{"name":"monster-blob","url":"https://i.imgur.com/OHWXXbK.png"},{"name":"devious","url":"https://i.imgur.com/EoK1bkk.png"},{"name":"chomper","url":"https://i.imgur.com/a1Dnudb.png"},{"name":"zipper","url":"https://i.imgur.com/5aHvPwN.png"},{"name":"cat-duck","url":"https://i.imgur.com/FocMZ0T.png"},{"name":"sailor-seal","url":"https://i.imgur.com/JW2M2gn.png"},{"name":"uncle-eagle","url":"https://i.imgur.com/SG2j4Cx.png"},{"name":"free-skies","url":"https://i.imgur.com/WpDOhdE.png"},{"name":"baby-gator","url":"https://i.imgur.com/AF9RxYn.png"},{"name":"jumping-mouse","url":"https://i.imgur.com/byzr0nL.png"},{"name":"dancer","url":"https://i.imgur.com/FpDw3vd.png"},{"name":"guitarist","url":"https://i.imgur.com/JWrJ1Mz.png"},{"name":"sweet-egg","url":"https://i.imgur.com/PZrnKXA.png"},{"name":"lop-bunny","url":"https://i.imgur.com/wFfOBQm.png"},{"name":"panda-fun","url":"https://i.imgur.com/5t3LFh0.png"},{"name":"madame-moo","url":"https://i.imgur.com/ApZoMau.png"},{"name":"moustache-mask","url":"https://i.imgur.com/4yVHenE.png"},{"name":"neon-dog","url":"https://i.imgur.com/uvj6i4l.png"},{"name":"rat","url":"https://i.imgur.com/TUgasc7.png"},{"name":"lucky-rat","url":"https://i.imgur.com/56XZ7Fo.png"},{"name":"golden-rat","url":"https://i.imgur.com/dzmSlDV.png"},{"name":"snow-friend","url":"https://i.imgur.com/jU3Bfys.png"},{"name":"snow-globe","url":"https://i.imgur.com/1FDq8o9.png"},{"name":"best-gift","url":"https://i.imgur.com/8vohHiB.png"},{"name":"caterpillar","url":"https://i.imgur.com/8pt5ETw.png"},{"name":"victory-orc","url":"https://i.imgur.com/uWMrLH4.png"},{"name":"the-yoga","url":"https://i.imgur.com/FTlajmr.png"},{"name":"hip-hop","url":"https://i.imgur.com/ybAXku9.png"},{"name":"big-barnum","url":"https://i.imgur.com/kMrmIf8.png"},{"name":"beary","url":"https://i.imgur.com/uhldA9L.png"},{"name":"big-shoes","url":"https://i.imgur.com/5WfM9Q4.png"},{"name":"the-claus","url":"https://i.imgur.com/LW8DEFZ.png"},{"name":"demonetized","url":"https://i.imgur.com/zyF4f2I.png"},{"name":"ooze-monster","url":"https://i.imgur.com/Ogz1c0N.png"},{"name":"lag-monster","url":"https://i.imgur.com/h7DmXav.png"},{"name":"dinersaur","url":"https://i.imgur.com/JkZ5cty.png"},{"name":"dino-star","url":"https://i.imgur.com/GzuVQiW.png"},{"name":"try-ceratops","url":"https://i.imgur.com/UMtR3f4.png"},{"name":"uniduck","url":"https://i.imgur.com/AixLXGO.png"},{"name":"turtail","url":"https://i.imgur.com/43i5Aog.png"},{"name":"mr-smile","url":"https://i.imgur.com/tvVtqAC.png"},{"name":"dabbit","url":"https://i.imgur.com/d7UeYMv.png"},{"name":"crack-me-up","url":"https://i.imgur.com/ZaziuEQ.png"},{"name":"egg-cited","url":"https://i.imgur.com/X8oPOyh.png"},{"name":"the-volto","url":"https://i.imgur.com/tTeJa0p.png"},{"name":"flamenco","url":"https://i.imgur.com/rDcl1rb.png"},{"name":"old-joker","url":"https://i.imgur.com/GveRZsL.png"},{"name":"mr.-claus","url":"https://i.imgur.com/uGChsrg.png"},{"name":"mad-flake","url":"https://i.imgur.com/JIi1EWZ.png"},{"name":"meltdown","url":"https://i.imgur.com/QoYY9ks.png"},{"name":"green-heist","url":"https://i.imgur.com/Fc6zv7O.png"},{"name":"fur-rocious","url":"https://i.imgur.com/Dcth9Ze.png"},{"name":"dummy","url":"https://i.imgur.com/oVwazli.png"},{"name":"the-undying","url":"https://i.imgur.com/qwSTJ8q.png"},{"name":"lol-pop","url":"https://i.imgur.com/qLOaBKI.png"},{"name":"so-jelly","url":"https://i.imgur.com/GgKER1m.png"},{"name":"a-dough-rable","url":"https://i.imgur.com/STiB30c.png"},{"name":"mr-freedom","url":"https://i.imgur.com/8k1mHpf.png"},{"name":"lady-liberty","url":"https://i.imgur.com/79nC1MP.png"},{"name":"the-eagle","url":"https://i.imgur.com/ivXtUmF.png"},{"name":"señor-avocado","url":"https://i.imgur.com/NhcLfIb.png"},{"name":"el-coyote","url":"https://i.imgur.com/XtvFbLw.png"},{"name":"adventurer","url":"https://i.imgur.com/ft7f7gn.png"},{"name":"silverback","url":"https://i.imgur.com/Fc3Ujkc.png"},{"name":"leopard","url":"https://i.imgur.com/OzR4YlW.png"},{"name":"bottle-map","url":"https://i.imgur.com/58rOmCK.png"},{"name":"treasure","url":"https://i.imgur.com/UgxQxPh.png"},{"name":"shiny-tree","url":"https://i.imgur.com/cj97AH1.png"},{"name":"jolly-santa","url":"https://i.imgur.com/ORlXl7K.png"},{"name":"fly","url":"https://i.imgur.com/tq33YWv.png"},{"name":"spider","url":"https://i.imgur.com/dzQIxk0.png"},{"name":"wasp","url":"https://i.imgur.com/qRq5CIg.png"},{"name":"lizard","url":"https://i.imgur.com/TPgKn6V.png"},{"name":"bat","url":"https://i.imgur.com/stjlVp6.png"},{"name":"snake","url":"https://i.imgur.com/TBpnDkh.png"},{"name":"fox","url":"https://i.imgur.com/QPCVdvQ.png"},{"name":"coyote","url":"https://i.imgur.com/YbmC0tv.png"},{"name":"hunter","url":"https://i.imgur.com/af3voUF.png"},{"name":"sumo","url":"https://i.imgur.com/XD20Tc4.png"},{"name":"bear","url":"https://i.imgur.com/wSxNs57.png"},{"name":"cougar","url":"https://i.imgur.com/868L1t7.png"},{"name":"panther","url":"https://i.imgur.com/soLQdok.png"},{"name":"lion","url":"https://i.imgur.com/YRJCaw8.png"},{"name":"crocodile","url":"https://i.imgur.com/zvR6dUC.png"},{"name":"shark","url":"https://i.imgur.com/nGtYZ3Z.png"},{"name":"mammoth","url":"https://i.imgur.com/hmVJPmb.png"},{"name":"raptor","url":"https://i.imgur.com/RKtDpin.png"},{"name":"t-rex","url":"https://i.imgur.com/toh1uzm.png"},{"name":"kraken","url":"https://i.imgur.com/xG5H6eL.png"},{"name":"party-time","url":"https://i.imgur.com/7JNq4eM.png"},{"name":"party-mode","url":"https://i.imgur.com/dBbBt2k.png"},{"name":"hungry","url":"https://i.imgur.com/tFJSrba.png"},{"name":"baby-dragon","url":"https://i.imgur.com/sRDtH7D.png"},{"name":"gargoyle","url":"https://i.imgur.com/83B3kor.png"},{"name":"sheep","url":"https://i.imgur.com/3KJbJwq.png"},{"name":"hamster","url":"https://i.imgur.com/uGFihXv.png"},{"name":"seven-years","url":"https://i.imgur.com/JXwR7bk.png"},{"name":"sixcess","url":"https://i.imgur.com/uPtVDf9.png"},{"name":"baseball-clash","url":"https://i.imgur.com/LiqWnrr.png"},{"name":"alien-blast","url":"https://i.imgur.com/79ZNaq4.png"},{"name":"dunker","url":"https://i.imgur.com/E0xn0Zk.png"},{"name":"viktory","url":"https://i.imgur.com/HUlpvG8.png"},{"name":"mini-football","url":"https://i.imgur.com/Qn90BVS.png"},{"name":"madam-militia","url":"https://i.imgur.com/4rfNRuw.png"},{"name":"duckface","url":"https://i.imgur.com/2X93v4I.png"},{"name":"ultimate-golf","url":"https://i.imgur.com/y0MqHYD.png"},{"name":"stayhome","url":"https://i.imgur.com/l08krVT.png"},{"name":"wannapieceofme","url":"https://i.imgur.com/6zVH5k0.png"},{"name":"sweetie","url":"https://i.imgur.com/cJM9SmR.png"},{"name":"kobe","url":"https://i.imgur.com/pkqzdQi.png"},{"name":"power","url":"https://i.imgur.com/GJl8LPR.png"},{"name":"head-ball-2","url":"https://i.imgur.com/L3e0Mpw.png"},{"name":"darts-of-fury","url":"https://i.imgur.com/pnnekZT.png"},{"name":"dapper-dog","url":"https://i.imgur.com/JrVatVJ.png"},{"name":"diamonds","url":"https://i.imgur.com/8tfP8ob.png"},{"name":"lightning","url":"https://i.imgur.com/TiUlyaJ.png"},{"name":"birthday-blob","url":"https://i.imgur.com/Jd4whes.png"},{"name":"boot-legger","url":"https://i.imgur.com/ZkjCeec.png"},{"name":"dynamite","url":"https://i.imgur.com/7jZ18Zk.png"},{"name":"slartie","url":"https://i.imgur.com/je17pME.png"},{"name":"candle-light","url":"https://i.imgur.com/86O54Dt.png"},{"name":"steam-mask","url":"https://i.imgur.com/ZWqxg4H.png"},{"name":"groovy-canvas","url":"https://i.imgur.com/eQTmvIN.png"},{"name":"party-mode","url":"https://i.imgur.com/dBbBt2k.png"},{"name":"cool","url":"https://i.imgur.com/lrohp1T.png"},{"name":"football-strike","url":"https://i.imgur.com/iJqUFEo.png"},{"name":"spitfire","url":"https://i.imgur.com/qYEUV5C.png"},{"name":"archery-king","url":"https://i.imgur.com/94sWGFT.png"},{"name":"earth-day","url":"https://i.imgur.com/NZmZysJ.png"},{"name":"the-hood","url":"https://i.imgur.com/Mrzme4m.png"},{"name":"sherbert","url":"https://i.imgur.com/nnoRYrN.png"},{"name":"kayo","url":"https://i.imgur.com/qc5H3li.png"},{"name":"alan","url":"https://i.imgur.com/BDLua2a.png"},{"name":"scott","url":"https://i.imgur.com/GzqFEjg.png"},{"name":"gordon","url":"https://i.imgur.com/yLg7KLt.png"},{"name":"virgil","url":"https://i.imgur.com/QHZjpcT.png"},{"name":"john","url":"https://i.imgur.com/JnafIBu.png"}];
    Client.skin.load = new Array();
    Client.skin.minion = "::random";
    Client.skin.player = "";

    Client.status = "inactive";

    /* Setup */

    Client.renderer.renderHTML();

    /* Canvases */

    Client.canvas = new Object();

    Client.canvas.main = createCanvas(windowWidth, windowHeight);
    Client.canvas.main.parent("main-canvas-container");
    Client.canvas.main.attribute("id", "main-canvas");

    Client.canvas.emoji = createGraphics(550, 550);
    Client.canvas.emoji.parent("chat-sub-container");
    Client.canvas.emoji.attribute("id", "emoji-canvas");
    Client.canvas.emoji.attribute("class", "absolute");
    Client.canvas.emoji.imageMode(CENTER);

    Client.util.generateEmojiGraphic();

    imageMode(CENTER);
    frameRate(165);
    pixelDensity(1);

    Client.loadMassGraphics();
    Client.loadSkinLi();

    Client.connect(Client.settings.url);
    Client.util.handleOnEvents();

    draw = () => {
        clear();

        Client.renderer.renderChatEmoji();
        Client.renderer.renderMapGrid();
        Client.renderer.setCameraView();

        let entities = Client.entities.viewport;
        entities = entities.slice(0).sort((a, b) => {
            return a.oldS === b.oldS ? a.id - b.id : b.oldS - a.oldS;
        });

        for (let i = entities.length - 1; i >= 0; i--) {
            const {type, nick, oldX, oldY, oldS, newS, color, skin} = entities[i];
            const threshold = 22;
            const isWithinThreshold = oldS * Client.camera.oldS > threshold;
            
            push();
            translate(oldX, oldY);
            switch (type) {
                case "pellet": {
                    Client.renderer.renderMapPellet(`pellet-${color.r}${color.g}${color.b}`, oldS * 2);
                } break;
                case "virus": {
                    Client.renderer.renderMapVirus(oldS * 2);
                } break;
                default: {
                    if (Client.cache.cell[`cell-${color.r}${color.g}${color.b}`]) {
                        image(Client.cache.cell[`cell-${color.r}${color.g}${color.b}`], 0, 0, oldS * 2, oldS * 2);
                    }

                    if (skin && Client.skin.load[Client.skin.load.findIndex(index => index.id == skin)]) {
                        image(Client.skin.load[Client.skin.load.findIndex(index => index.id == skin)].graphic, 0, 0, (oldS * 2) + 2.5, (oldS * 2) + 2.5);
                    }

                    if (isWithinThreshold) {
                        if (Client.cache.mass[Math.floor(oldS)]) {
                            image(Client.cache.mass[Math.floor(oldS)], 0, nick ? newS / 2.25 : 0, newS * 2, newS * 2);
                        }

                        if (nick && Client.cache.nick[Client.cache.nick.findIndex(index => index.id == nick)]) {
                            const array = Client.cache.nick;
                            const index = Client.cache.nick.findIndex(index => index.id == nick);
                            const graphic = array[index].graphic;
    
                            image(graphic, 0, newS / 10, newS * 2.65, newS * 2.65);
                        }
                    }
                } break;
            }
            pop();

            if (entities[i].destroyer) {
                entities[i].oldX += (entities[i].destroyer.newX - entities[i].oldX) * (deltaTime / 30);
                entities[i].oldY += (entities[i].destroyer.newY - entities[i].oldY) * (deltaTime / 30);
                entities[i].oldS += (1 - entities[i].oldS) * (deltaTime / 100);

                if (entities[i].oldS <= 2) {
                    if (Client.util.hasPlayerId(entities[i].id)) {
                        Client.entities.player.splice(Client.entities.player.findIndex(index => index.id == entities[i].id), 1);
                    }

                    Client.entities.viewport.splice(Client.entities.viewport.findIndex(index => index.id == entities[i].id), 1);
                }
            } else {
                if (!document.hidden) {
                    entities[i].oldX += (deltaTime / 200) * (entities[i].newX - entities[i].oldX);
                    entities[i].oldY += (deltaTime / 200) * (entities[i].newY - entities[i].oldY);
                    entities[i].oldS += (deltaTime / 200) * (entities[i].newS - entities[i].oldS);
                }
            }
        }

        Client.util.getCameraPosition();
        Client.renderer.setCameraViewUpdate();

        if (keyIsDown(82)) {
            Client.eject("minion");
        }

        if (keyIsDown(87)) {
            Client.eject("player");
        }
    };

    keyPressed = () => {
        switch (!$("#overlay-container").is("visible")) {
            case true: {
                switch (keyCode) {
                    case 13: {
                        $("#message-input").is(":focus") ? Client.sendChatMessage() : $("#message-input").focus();
                    } break;
                    case 27: {
                        Client.toggleOverlayContainers();
                    } break;
                    case 32: {
                        !$("#message-input").is(":focus") && Client.split("player");
                    } break;
                    case 69: {
                        !$("#message-input").is(":focus") && Client.split("minion");
                    } break;
                }
            } break;
            default: {
                switch (keyCode) {
                    case 27: {
                        Client.toggleOverlayContainers();
                    } break;
                }
            }
        }
    }

    mouseWheel = (event) => {
        const gameOverlayIsVisible = $("#game-overlay-container").is(":visible");
        const mouseOverChat = $("#chat-sub-container").is(":hover");

        if (gameOverlayIsVisible && !mouseOverChat) {
            Client.camera.newS = Client.camera.newS + (event.delta > 0 ? - Client.camera.newS / 15 : Client.camera.newS / 15);
            Client.camera.newS = Client.camera.newS < 0.125 ? 0.125 : Client.camera.newS > 1.5 ? 1.5 : Client.camera.newS;
        }
    };

    windowResized = () => {
        resizeCanvas(windowWidth, windowHeight);
    };
};