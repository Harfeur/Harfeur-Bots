const Discord = require('discord.js');
const twitch = require('twitch-api-v5');
const {
    Client
} = require('pg');
const {
    client
} = require('tmi.js');

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

                    if (row.canalid == "0") return;

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
                                                .catch(console.error);
                                        });
                                } else {
                                    canal.messages.fetch(messageID)
                                        .then(message => {
                                            message.edit(`${messageLive}\n<${res.stream.channel.url}>`, {
                                                "embed": embed
                                            });
                                        });
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
        if (msg.author.bot && !msg.content.toLowerCase().startsWith('t!')) return;

        let args = msg.content.split(' ');
        let command = args[0].toLowerCase().split('t!')[1];

        if (!msg.member.hasPermission('ADMINISTRATOR')) {
            msg.reply('Seuls les administratuers peuvent me configurer...');
            return;
        }

        if (command === 'setup') {
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
                        var userName = args[1];
                        clientpg.query(`SELECT * FROM twitch WHERE channelid='${userId}' AND serverid='${msg.guild.id}';`)
                            .then(query => {
                                if (query.rowCount != 0) {
                                    msg.reply('Il existe déjà une alerte avec cet utilisateur. Vous pouvez le supprimer avec t!delete');
                                } else {
                                    clientpg.query(`INSERT INTO twitch(channelid, serverid) VALUES (${userId}, ${msg.guild.id});`)
                                        .then(() => {
                                            console.log("Enregistrement en cours d'un nouveau streameur");

                                            function collectChannel(userId) {
                                                const collector = new Discord.MessageCollector(msg.channel, m => m.author.id === msg.author.id, {
                                                    max: 1
                                                });
                                                collector.on('collect', message => {
                                                    if (message.mentions.channels.size != 0 && message.mentions.channels.first().isText()) {
                                                        var channel = message.mentions.channels.first();
                                                        if (channel.permissionsFor(twitchBot.user).has('SEND_MESSAGES')) {
                                                            clientpg.query(`UPDATE twitch SET canalid='${channel.id}' WHERE channelid=${userId} AND serverid='${message.guild.id}';`);
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
                                                    var msgStart = message.content;
                                                    clientpg.query(`UPDATE twitch SET messagelive='${msgStart}' WHERE channelid=${userId} AND serverid='${message.guild.id}';`);
                                                    message.reply("Et finalement, le message de fin qui partagera la rediff ? (sans mentions)");
                                                    collectEnd(userId);
                                                });
                                            }

                                            function collectEnd(userId) {
                                                const collector = new Discord.MessageCollector(msg.channel, m => m.author.id === msg.author.id, {
                                                    max: 1
                                                });
                                                collector.on('collect', message => {
                                                    var msgEnd = message.content;
                                                    clientpg.query(`UPDATE twitch SET messagefin='${msgEnd}' WHERE channelid=${userId} AND serverid='${message.guild.id}';`);
                                                    message.reply("C'est fini ! Les notifications apparaitront lors du prochain LIVE, ou bientot si un LIVE est déjà en cours.");
                                                });
                                            }

                                            msg.reply('Dans quel channel doit-je afficher les alertes de LIVE ?');

                                            collectChannel(userId);

                                        })
                                        .catch(err => {
                                            console.error(err);
                                            msg.reply("Une erreur s'est produite avec la base de données.");
                                        });
                                }
                            })
                            .catch(err => {
                                console.error(err);
                                msg.reply("Une erreur s'est produite avec la base de données.");
                            });
                    }
                });
            }
        }

        if (command === 'delete') {
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
        }
    });

    twitchBot.on('ready', () => {
        console.log(`Bot ${twitchBot.user.tag} démarré !`);
        setInterval(fetchLive, 60000);
        fetchLive();
    });

    twitchBot.login(process.env.TWITCHBOT);

}