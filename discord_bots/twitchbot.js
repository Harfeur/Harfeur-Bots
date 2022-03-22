const Discord = require('discord.js');
const TwitchApi = require('node-twitch').default;
const {
    Client
} = require('pg');

const languages = ["fr", "en"]
const translations = {}
languages.forEach(lang => {
    translations[lang] = require(`./langs/strings_${lang}.json`)
});

const sprintf = require('sprintf-js').sprintf;

const twitchV2 = new TwitchApi({
    client_id: process.env.TWITCH_BOT_CLIENT_ID,
    client_secret: process.env.TWITCH_BOT_CLIENT_SECRET
});

const clientpg = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

clientpg.connect();

exports.run = () => {

    const twitchBot = new Discord.Client();

    function fetchLive() {
        clientpg.query('SELECT * FROM twitch LEFT JOIN guilds ON twitch.serverid = guilds.guild_id')
            .then(query => {
                var querySplice = []
                while (query.rows.length) {
                    querySplice.push(query.rows.splice(0, 100));
                }
                querySplice.forEach(queries => {
                    var ids = queries.map(q => q.channelid)
                    twitchV2.getStreams({
                        channels: ids,
                        first: 100
                    }).then(resAll => {
                        queries.forEach(row => {
                            if (row.canalid && row.canalid == "0") return;

                            var messageID = row.messageid;
                            var messageLive = row.messagelive;
                            var messageFin = row.messagefin;
                            var channelid = row.channelid;
                            var canalid = row.canalid;
                            var serverid = row.serverid;
                            var lang = row.language ? row.language : "fr";

                            var stream = resAll.data.filter(stream => stream.user_id == channelid)
                            stream = stream.length != 0 ? stream[0] : null

                            var serveur = twitchBot.guilds.resolve(serverid);
                            if (serveur == null || !serveur.available) return;
                            var canal = serveur.channels.resolve(canalid);
                            if (canal == null || !canal.permissionsFor(twitchBot.user).has('SEND_MESSAGES')) return;

                            if (serverid != "637315966631542801") return;

                            if (stream) {
                                twitchV2.getUsers(channelid)
                                    .then(twitchUser => {

                                        if (twitchUser.data.length == 0) return;

                                        var user = twitchUser.data[0];

                                        var now = Date.now();
                                        var debut = new Date(stream.started_at)

                                        var heures = Math.trunc(((now - debut) / 60000) / 60);
                                        var minutes = Math.trunc((now - debut) / 60000 - heures * 60)

                                        var embed = new Discord.MessageEmbed({
                                            "color": 9442302,
                                            "timestamp": stream.started_at,
                                            "title": "🔴 " + sprintf(translations[lang]["TITLE"], user.display_name),
                                            "url": `https://www.twitch.tv/${user.login}`,
                                            "thumbnail": {
                                                "url": user.profile_image_url
                                            },
                                            "image": {
                                                "url": `https://static-cdn.jtvnw.net/ttv-boxart/${stream.game_name.split(" ").join("%20")}-272x380.jpg`
                                            },
                                            "footer": {
                                                "text": translations[lang]["START"]
                                            },
                                            "author": {
                                                "name": "Twitch",
                                                "url": `https://www.twitch.tv/${user.login}`,
                                                "icon_url": "https://cdn3.iconfinder.com/data/icons/social-messaging-ui-color-shapes-2-free/128/social-twitch-circle-512.png"
                                            },
                                            "fields": [{
                                                "name": translations[lang]["STATUS"],
                                                "value": stream.title
                                            },
                                                {
                                                    "name": translations[lang]["GAME"],
                                                    "value": stream.game_name,
                                                    "inline": true
                                                },
                                                {
                                                    "name": translations[lang]["LENGTH"],
                                                    "value": sprintf(translations[lang]["LENGTH_TIME"], heures, minutes),
                                                    "inline": true
                                                },
                                                {
                                                    "name": translations[lang]["VIEWERS"],
                                                    "value": stream.viewer_count,
                                                    "inline": true
                                                }
                                            ]
                                        });
                                        if (messageID == "0") {
                                            canal.send(`${messageLive}\n<https://www.twitch.tv/${user.login}>`, {
                                                "embed": embed
                                            })
                                                .then(msg => {
                                                    clientpg.query(`UPDATE twitch SET messageID = '${msg.id}' WHERE channelID=${channelid} AND serverid='${serverid}';`)
                                                })
                                                .catch(console.error);
                                        } else {
                                            canal.messages.fetch(messageID)
                                                .then(message => {
                                                    message.edit(`${messageLive}\n<https://www.twitch.tv/${user.login}>`, {
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
                                    })
                                    .catch(console.error)
                            } else if (messageID != "0") {
                                clientpg.query(`UPDATE twitch SET messageID = '0' WHERE channelID=${channelid} AND serverid='${serverid}';`)
                                    .catch(console.error);

                                twitchV2.getVideos({
                                    user_id: channelid,
                                    type: "archive"
                                })
                                    .then(video => {
                                        video = video.data.length != 0 ? video.data[0] : null
                                        canal.messages.fetch(messageID)
                                            .then(message => {
                                                if (!video) {
                                                    // Pas de redif
                                                    if (message.embeds.length > 0) {
                                                        var embed = message.embeds[0]
                                                        embed.setTitle(translations[lang]["LIVE_END"]);
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
                                                        embed.setTitle(translations[lang]["LIVE_END"]);
                                                        embed.fields = embed.fields.filter(field => field.name != "Viewers");
                                                        embed.setURL(video.url);
                                                        message.edit(`${messageFin} <${video.url}>`, {
                                                            "embed": embed
                                                        });
                                                    } else {
                                                        message.edit(`${messageFin} <${video.url}>`);
                                                    }
                                                }
                                            });
                                    }).catch(console.error)
                            }
                        })
                    }).catch(console.error);
                });
            });
    }

    twitchBot.on('message', msg => {
        if (msg.author.bot || !msg.content.toLowerCase().startsWith('t!')) return;

        let args = msg.content.split(' ');
        let command = args[0].toLowerCase().split('t!')[1];

        msg.reply("Les commands textuelles seront bientôt obsoletes. Vous pouvez utiliser les slash commandes : `/setup` ou `/delete`");

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

            if (args.length != 2) msg.reply('Vous devez indiquer le nom de votre chaine en paramètre. Par exemple `t!setup harfeur`');
            else {
                twitchV2.getUsers(args[1])
                    .then(res => {
                        if (res.data.length == 0) {
                            msg.reply("Aucun résultat, êtes vous sûr d'avoir bien saisi le pseudo ?")
                        } else {
                            var userId = res.data[0].id;
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
                    }).catch(err => {
                    console.error(err);
                    msg.reply("Une erreur est survenue avec Twitch.");
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

            if (args.length != 2) msg.reply('Vous devez indiquer le nom de votre chaine en paramètre. Par exemple `t!delete harfeur`');
            else {
                twitchV2.getUsers(args[1])
                    .then(res => {
                        if (res.data.length == 0) {
                            msg.reply("Aucun résultat, êtes vous sûr d'avoir bien saisi le pseudo ?")
                        } else {
                            var userId = res.data[0].id;
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
                    }).catch(err => {
                    console.error(err);
                    msg.reply("Une erreur est survenue avec Twitch.");
                });
            }

        }
    });

    twitchBot.on('ready', () => {
        console.log(`Bot ${twitchBot.user.tag} démarré !`);
        setInterval(fetchLive, 90000);
        fetchLive();
    });

    function reply(interaction, message, type = 4) {
        twitchBot.api.interactions(interaction.id, interaction.token).callback.post({
            data: {
                type: type,
                data: {
                    content: message
                }
            }
        });
    }

    twitchBot.ws.on('INTERACTION_CREATE', async interaction => {
        if (!interaction.guild_id) {
            reply(interaction, "Ce bot ne fonctionne que dans des serveurs pour le moment.\nThis bot only works with guilds for now.");
            return;
        }

        clientpg.query(`SELECT language FROM guilds WHERE guild_id='${interaction.guild_id}'`)
            .then(query => {
                var lang = query.rowCount != 0 ? query.rows[0].language : "fr"

                // VERIFY ADMIN
                var permissions = parseInt(interaction.member.permissions).toString(2);
                if (permissions.length < 4 || permissions[permissions.length - 4] != 1) {
                    reply(interaction, translations[lang]["NO_RIGHTS"]);
                    return;
                }
                if (interaction.type == 2)
                    switch (interaction.data.name) {
                        case "setup":
                            twitchBot.api.interactions(interaction.id, interaction.token).callback.post({
                                data: {
                                    type: 9,
                                    data: {
                                        title: translations[lang]["SETUP_TITLE"],
                                        custom_id: 'modal_setup',
                                        components: [{
                                            type: 1,
                                            components: [{
                                                type: 4,
                                                style: 1,
                                                custom_id: 'streamer',
                                                label: translations[lang]["SETUP_STREAMER"],
                                                placeholder: 'harfeur',
                                                required: true
                                            }]
                                        },
                                            {
                                                type: 1,
                                                components: [{
                                                    type: 4,
                                                    style: 2,
                                                    custom_id: 'start',
                                                    label: translations[lang]["SETUP_START"],
                                                    placeholder: translations[lang]["SETUP_START_PLACEHOLDER"],
                                                    required: true
                                                }]
                                            },
                                            {
                                                type: 1,
                                                components: [{
                                                    type: 4,
                                                    style: 2,
                                                    custom_id: 'end',
                                                    label: translations[lang]["SETUP_END"],
                                                    placeholder: translations[lang]["SETUP_END_PLACEHOLDER"],
                                                    required: true
                                                }]
                                            },
                                        ]
                                    }
                                }
                            });
                            break;

                        case "delete":
                            var guild = twitchBot.guilds.resolve(interaction.guild_id);
                            clientpg.query(`SELECT * FROM twitch WHERE serverid='${interaction.guild_id}';`)
                                .then(async query => {
                                    if (query.rowCount == 0) {
                                        reply(interaction, translations[lang]["DELETE_EMPTY"])
                                        return;
                                    }

                                    var options = [];

                                    for (var i = 0; i < query.rowCount && i < 25; i++) {
                                        var q = query.rows[i];
                                        var user = await twitchV2.getUsers(q.channelid);
                                        options.push({
                                            label: user.data[0].display_name,
                                            value: q.channelid,
                                            description: guild.channels.resolve(q.canalid) ? guild.channels.resolve(q.canalid).name : `Canal n°${q.canalid} introuvable`
                                        })
                                    }

                                    twitchBot.api.interactions(interaction.id, interaction.token).callback.post({
                                        data: {
                                            type: 4,
                                            data: {
                                                content: translations[lang]["DELETE_CHOOSE_TITLE"],
                                                components: [{
                                                    "type": 1,
                                                    "components": [{
                                                        "type": 3,
                                                        "custom_id": "select_delete",
                                                        "options": options,
                                                        "placeholder": translations[lang]["DELETE_CHOOSE_PLACEHOLDER"]
                                                    }]
                                                }]
                                            }
                                        }
                                    });
                                });
                            break;

                        case "language":
                            var guild = interaction.guild_id;
                            var lang = interaction.data.options[0].value
                            clientpg.query(`INSERT INTO guilds(guild_id, language) VALUES (${guild},'${lang}')
                            ON CONFLICT (guild_id) DO UPDATE SET language = '${lang}';`)
                                .then(() => {
                                    reply(interaction, translations[lang]["LANGUAGE_UPDATE"])
                                })
                                .catch(err => {
                                    reply(interaction, translations[lang]["DATABASE_ERROR"]);
                                    console.error(err);
                                })
                            break;
                    }
                else if (interaction.type == 3) {
                    switch (interaction.data.custom_id) {
                        case "select_delete":
                            clientpg.query(`DELETE FROM twitch WHERE channelid=${interaction.data.values[0]} AND serverid='${interaction.guild_id}';`)
                                .then(() => {
                                    reply(interaction, translations[lang]["DELETE_SUCCESS"], 7);
                                }).catch(err => {
                                    reply(interaction, translations[lang]["DATABASE_ERROR"], 7);
                                    console.error(err);
                                });
                            break;

                        default:
                            break;
                    }
                } else if (interaction.type == 5) {
                    switch (interaction.data.custom_id) {
                        case "modal_setup":
                            twitchV2.getUsers(interaction.data.components[0].components[0].value)
                                .then(res => {
                                    if (!res.data || res.data.length == 0) {
                                        reply(interaction, translations[lang]["SETUP_NO_RESULT"])
                                    } else {
                                        let channelID, messageLIVE, messageFIN;
                                        console.log("Enregistrement en cours d'un nouveau streameur");

                                        let userId = res.data[0].id;
                                        clientpg.query(`SELECT * FROM twitch WHERE channelid=${userId} AND serverid='${interaction.guild_id}';`)
                                            .then(query => {
                                                if (query.rowCount !== 0) {
                                                    reply(interaction, translations[lang]["SETUP_ALREADY"]);
                                                } else {
                                                    let channel = twitchBot.channels.resolve(interaction.channel_id);
                                                    if (!channel.permissionsFor(twitchBot.user).has('SEND_MESSAGES')) {
                                                        reply(interaction, translations[lang]["SETUP_NO_PERMISSIONS"]);
                                                    } else {
                                                        channelID = channel.id;
                                                        messageLIVE = interaction.data.components[1].components[0].value.replaceAll("'", "''");
                                                        messageFIN = interaction.data.components[2].components[0].value.replaceAll("'", "''");

                                                        clientpg.query(`INSERT INTO twitch(channelid, serverid, canalid, messagelive, messagefin) VALUES (${userId}, '${interaction.guild_id}', '${channelID}', '${messageLIVE}', '${messageFIN}');`)
                                                            .then(() => {
                                                                reply(interaction, translations[lang]["SETUP_FINISH"]);
                                                            })
                                                            .catch(err => {
                                                                reply(interaction, translations[lang]["DATABASE_ERROR"]);
                                                                console.error(err);
                                                            });
                                                    }
                                                }
                                            });
                                    }
                                }).catch(err => {
                                    reply(interaction, translations[lang]["DATABASE_ERROR"]);
                                    console.error(err);
                                });
                            break;

                        default:
                            break;
                    }
                }
            }).catch(err => {
                reply(interaction, translations["fr"]["DATABASE_ERROR"] + " / " + translations["en"]["DATABASE_ERROR"]);
                console.error(err);
            });
    });

    twitchBot.login(process.env.TWITCHBOT);
}