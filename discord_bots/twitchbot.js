const Discord = require('discord.js');
const twitch = require('twitch-api-v5');
const {
    Client
} = require('pg');

const clientpg = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

clientpg.connect();

exports.run = () => {

    const twitchBot = new Discord.Client();

    twitch.clientID = process.env.TWITCH_APP;

    function fetchLive() {
        clientpg.query('SELECT * FROM twitch')
            .then(query => {
                query.rows.forEach(row => {

                    if (row.canalid && row.canalid == "0") return;

                    var messageID = row.messageid;
                    var messageLive = row.messagelive;
                    var messageFin = row.messagefin;
                    var channelid = row.channelid.toString();
                    var canalid = row.canalid;
                    var serverid = row.serverid;

                    twitch.streams.channel({
                        channelID: channelid
                    }, (err, res) => {

                        if (err) {
                            console.error(err);
                        } else {
                            var serveur = twitchBot.guilds.resolve(serverid);
                            if (serveur == null || !serveur.available) return;
                            var canal = serveur.channels.resolve(canalid);
                            if (canal == null || !canal.permissionsFor(twitchBot.user).has('SEND_MESSAGES')) return;

                            if (res.stream != null) {
                                var now = Date.now();
                                var debut = new Date(res.stream.created_at)

                                var heures = Math.trunc(((now - debut) / 60000) / 60);
                                var minutes = Math.trunc((now - debut) / 60000 - heures * 60)

                                var embed = new Discord.MessageEmbed({
                                    "color": 9442302,
                                    "timestamp": res.stream.created_at,
                                    "title": `🔴 ${res.stream.channel.display_name} est en LIVE`,
                                    "url": res.stream.channel.url,
                                    "thumbnail": {
                                        "url": res.stream.channel.logo
                                    },
                                    "image": {
                                        "url": `https://static-cdn.jtvnw.net/ttv-boxart/${res.stream.channel.game.split(" ").join("%20")}-272x380.jpg`
                                    },
                                    "footer": {
                                        "text": "Début"
                                    },
                                    "author": {
                                        "name": "Twitch",
                                        "url": res.stream.channel.url,
                                        "icon_url": "https://cdn3.iconfinder.com/data/icons/social-messaging-ui-color-shapes-2-free/128/social-twitch-circle-512.png"
                                    },
                                    "fields": [{
                                        "name": "Status",
                                        "value": res.stream.channel.status
                                    },
                                    {
                                        "name": "Jeu",
                                        "value": res.stream.channel.game,
                                        "inline": true
                                    },
                                    {
                                        "name": "Durée",
                                        "value": `${heures} h ${minutes} min`,
                                        "inline": true
                                    },
                                    {
                                        "name": "Viewers",
                                        "value": res.stream.viewers,
                                        "inline": true
                                    }
                                    ]
                                });
                                if (messageID == "0") {
                                    canal.send(`${messageLive}\n<${res.stream.channel.url}>`, {
                                        "embed": embed
                                    })
                                        .then(msg => {
                                            clientpg.query(`UPDATE twitch SET messageID = '${msg.id}' WHERE channelID=${channelid} AND serverid='${serverid}';`)
                                        })
                                        .catch(console.error);
                                } else {
                                    canal.messages.fetch(messageID)
                                        .then(message => {
                                            message.edit(`${messageLive}\n<${res.stream.channel.url}>`, {
                                                "embed": embed
                                            });
                                        })
                                        .catch(err => {
                                            if (err.code == 10008) {
                                                clientpg.query(`UPDATE twitch SET messageID = '0' WHERE channelID=${channelid} AND serverid='${serverid}';`)
                                            } else {
                                                console.error(err);
                                            }
                                        })
                                }
                            } else if (messageID != "0") {
                                clientpg.query(`UPDATE twitch SET messageID = '0' WHERE channelID=${channelid} AND serverid='${serverid}';`)
                                    .catch(console.error);

                                twitch.channels.videos({
                                    channelID: channelid,
                                    limit: 1,
                                    broadcast_type: 'archive'
                                }, (err, res2) => {
                                    if (err) console.error(err);
                                    else {
                                        canal.messages.fetch(messageID)
                                            .then(message => {
                                                if (res2.videos.length == 0) {
                                                    // Pas de redif
                                                    if (message.embeds.length > 0) {
                                                        var embed = message.embeds[0]
                                                        embed.setTitle("LIVE terminé");
                                                        embed.fields = embed.fields.filter(field => field.name != "Viewers");
                                                        message.edit(messageFin, {
                                                            "embed": embed
                                                        });
                                                    } else {
                                                        message.edit(messageFin);
                                                    }
                                                } else {
                                                    if (message.embeds.length > 0) {
                                                        var embed = message.embeds[0]
                                                        embed.setTitle("LIVE terminé");
                                                        embed.fields = embed.fields.filter(field => field.name != "Viewers");
                                                        embed.setURL(res2.videos[0].url);
                                                        message.edit(`${messageFin} <${res2.videos[0].url}>`, {
                                                            "embed": embed
                                                        });
                                                    } else {
                                                        message.edit(`${messageFin} <${res2.videos[0].url}>`);
                                                    }
                                                }
                                            });
                                    }
                                });
                            }
                        }

                    });
                });
            });
    }

    twitchBot.on('message', msg => {
        if (msg.author.bot || !msg.content.toLowerCase().startsWith('t!')) return;

        let args = msg.content.split(' ');
        let command = args[0].toLowerCase().split('t!')[1];

        if (command === 'help') {
            msg.reply("Pour configurer le bot, exécutez la commande `t!setup <user>` où `<user>` correspond au nom d'utilisateur Twitch.\n" +
                "Vous pourrez ensuite suivre les indications, en choisissant ou non de mentionner des roles (par exemple @ everyone).\n\n" +
                "Pour supprimer une alerte, faites `t!delete <user>`")
        }

        if (command === 'stats') {
            const ToTalSeconds = (twitchBot.uptime / 1000);
            const Days = Math.floor(ToTalSeconds / 86400);
            const Hours = Math.floor(ToTalSeconds / 3600);
            const Minutes = Math.floor(ToTalSeconds / 60);
            const Seconds = Math.floor(ToTalSeconds % 60);
            const Uptime = `${Days} Days, ${Hours} Hours, ${Minutes} Minutes & ${Seconds} Seconds`;
            const MemoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
            const RamUsed = Math.round(process.cpuUsage().system) / 1024;
            const RamUsage = Math.trunc(RamUsed);
            const BotPlatform = process.platform;
            const MemoryUsed = Math.trunc(MemoryUsage);
            const SystemPing = Math.round(twitchBot.ws.ping);
            const stats = new Discord.MessageEmbed()
                .setColor('#b700ff')
                .setTitle("Stats")
                .addField(" \u200B ", "**Bot Uptime** : ` " + `${Uptime}` + " `")
                .addField(" \u200B ", "**CPU Usage** :  ` " + RamUsage + "Mb `")
                .addField(" \u200B ", "**Memory Usage** :  ` " + MemoryUsed + "Mb `")
                .addField(" \u200B ", "**Bot Platform** :  ` " + BotPlatform + " `")
                .addField(" \u200B ", "**System Ping** :  ` " + SystemPing + " `")
                .addField(" \u200B ", "**Channels** : ` " + `${twitchBot.channels.cache.size}` + " `")
                .addField(" \u200B ", "**Servers** : ` " + `${twitchBot.guilds.cache.size}` + " `")
                .addField(" \u200B ", "**Users** : ` " + `${twitchBot.users.cache.size}` + " `")
            msg.channel.send(stats);
            return;
        }

        if (command === 'setup') {
            if (msg.channel.type !== "text") {
                msg.reply("La configuration ne peut se faire que dans un serveur");
                return;
            }

            if (!msg.member.hasPermission('ADMINISTRATOR')) {
                msg.reply('Seuls les administratuers peuvent me configurer...');
                return;
            }

            if (args.length != 2) msg.reply('Vous devez indiquer le nom de votre chaine en paramètre. Par exemple `t!setup squeezie`');
            else {
                twitch.users.usersByName({
                    users: args[1]
                }, (err, res) => {
                    if (err) {
                        console.error(err);
                        msg.reply("Une erreur avec twitch est survenue, êtes vous sûr d'avoir bien saisi le pseudo ?")
                    } else {
                        var userId = res.users[0]._id;
                        clientpg.query(`SELECT * FROM twitch WHERE channelid=${userId} AND serverid='${msg.guild.id}';`)
                            .then(query => {
                                if (query.rowCount != 0) {
                                    msg.reply('Il existe déjà une alerte avec cet utilisateur. Vous pouvez le supprimer avec t!delete');
                                } else {
                                    let channelID, messageLIVE, messageFIN;
                                    console.log("Enregistrement en cours d'un nouveau streameur");

                                    function collectChannel(userId) {
                                        const collector = new Discord.MessageCollector(msg.channel, m => m.author.id === msg.author.id, {
                                            max: 1
                                        });
                                        collector.on('collect', message => {
                                            if (message.mentions.channels.size != 0 && message.mentions.channels.first().isText()) {
                                                var channel = message.mentions.channels.first();
                                                if (channel.permissionsFor(twitchBot.user).has('SEND_MESSAGES')) {
                                                    channelID = channel.id;
                                                    message.reply("Quel sera le message d'annonce du LIVE ? (inclure les mentions)");
                                                    collectStart(userId);
                                                } else {
                                                    message.reply("Je n'ai pas la permission d'envoyer un message dans ce canal... Merci de vérifier les permissions et de rementionner le canal une fois terminé.");
                                                }
                                            } else {
                                                message.reply("Merci de mentionner un canal texte");
                                                collectChannel(userId);
                                            }
                                        });
                                    }

                                    function collectStart(userId) {
                                        const collector = new Discord.MessageCollector(msg.channel, m => m.author.id === msg.author.id, {
                                            max: 1
                                        });
                                        collector.on('collect', message => {
                                            messageLIVE = message.content.replaceAll("'", "''");
                                            message.reply("Et finalement, le message de fin qui partagera la rediff ? (sans mentions)");
                                            collectEnd(userId);
                                        });
                                    }

                                    function collectEnd(userId) {
                                        const collector = new Discord.MessageCollector(msg.channel, m => m.author.id === msg.author.id, {
                                            max: 1
                                        });
                                        collector.on('collect', message => {
                                            messageFIN = message.content.replaceAll("'", "''");


                                            clientpg.query(`INSERT INTO twitch(channelid, serverid, canalid, messagelive, messagefin) VALUES (${userId}, '${msg.guild.id}', '${channelID}', '${messageLIVE}', '${messageFIN}');`)
                                                .then(() => {
                                                    message.reply("C'est fini ! Les notifications apparaitront lors du prochain LIVE, ou bientot si un LIVE est déjà en cours.");
                                                })
                                                .catch(err => {
                                                    console.error(err);
                                                    msg.reply("Une erreur s'est produite avec la base de données.");
                                                });

                                        });
                                    }

                                    msg.reply('Dans quel channel doit-je afficher les alertes de LIVE ?');

                                    collectChannel(userId);

                                }
                            })
                            .catch(err => {
                                console.error(err);
                                msg.reply("Une erreur s'est produite avec la base de données.");
                            });
                    }
                });
            }
            return;
        }

        if (command === 'delete') {
            if (msg.channel.type !== "text") {
                msg.reply("La configuration ne peut se faire que dans un serveur");
                return;
            }

            if (!msg.member.hasPermission('ADMINISTRATOR')) {
                msg.reply('Seuls les administratuers peuvent me configurer...');
                return;
            }

            if (args.length != 2) msg.reply('Vous devez indiquer le nom de votre chaine en paramètre. Par exemple `t!delete squeezie`');
            else {
                twitch.users.usersByName({
                    users: args[1]
                }, (err, res) => {
                    if (err) {
                        console.error(err);
                        msg.reply("Une erreur avec twitch est survenue, êtes vous sûr d'avoir bien saisi le pseudo ?")
                    } else {
                        var userId = res.users[0]._id;
                        clientpg.query(`SELECT * FROM twitch WHERE channelid=${userId} AND serverid='${msg.guild.id}';`)
                            .then(query => {
                                if (query.rowCount != 0) {
                                    clientpg.query(`DELETE FROM twitch WHERE channelid=${userId} AND serverid='${msg.guild.id}';`);
                                    msg.reply("Alerte supprimée avec succès !")
                                } else {
                                    msg.reply('Aucune alerte sur ce serveur. Vous pouvez commencer avec t!setup');
                                }
                            });
                    }
                });
            }
            return;
        }
    });

    twitchBot.on('ready', () => {
        console.log(`Bot ${twitchBot.user.tag} démarré !`);
        setInterval(fetchLive, 90000);
        fetchLive();
    });

    function reply(interaction, message) {
        twitchBot.api.interactions(interaction.id, interaction.token).callback.post({
            data: {
                type: 4,
                data: {
                    content: message
                }
            }
        });
    }

    twitchBot.ws.on('INTERACTION_CREATE', async interaction => {
        if (!interaction.guild_id) return;
        switch (interaction.data.name) {
            case "setup":
                twitch.users.usersByName({
                    users: interaction.data.options[0].value
                }, (err, res) => {
                    if (err) {
                        console.error(err);
                        reply(interaction, "Une erreur avec twitch est survenue, êtes vous sûr d'avoir bien saisi le pseudo ?")
                    } else {
                        let channelID, messageLIVE, messageFIN;
                        console.log("Enregistrement en cours d'un nouveau streameur");

                        let userId = res.users[0]._id;
                        clientpg.query(`SELECT * FROM twitch WHERE channelid=${userId} AND serverid='${interaction.guild_id}';`)
                            .then(query => {
                                if (query.rowCount !== 0) {
                                    reply(interaction, 'Il existe déjà une alerte avec cet utilisateur. Vous pouvez le supprimer avec t!delete');
                                } else {
                                    let channel = twitchBot.channels.resolve(interaction.data.options[1].value);
                                    if (!channel.permissionsFor(twitchBot.user).has('SEND_MESSAGES')) {
                                        reply(interaction, "Je n'ai pas la permission d'envoyer un message dans ce canal... Merci de vérifier les permissions et de refaire la commande une fois terminé.");
                                    } else {
                                        channelID = channel.id;
                                        messageLIVE = interaction.data.options[2].value;
                                        messageFIN = interaction.data.options[3].value;

                                        clientpg.query(`INSERT INTO twitch(channelid, serverid, canalid, messagelive, messagefin) VALUES (${userId}, '${interaction.guild_id}', '${channelID}', '${messageLIVE}', '${messageFIN}');`)
                                            .then(() => {
                                                reply(interaction, "C'est fini ! Les notifications apparaitront lors du prochain LIVE, ou bientot si un LIVE est déjà en cours.");
                                            })
                                            .catch(err => {
                                                console.error(err);
                                                reply(interaction, "Une erreur s'est produite avec la base de données.");
                                            });
                                    }
                                }
                            });
                    }
                });
                break;

            case "delete":
                break;
        }
    })

    twitchBot.login(process.env.TWITCHBOT);

}