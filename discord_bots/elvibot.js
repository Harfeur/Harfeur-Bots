const Discord = require('discord.js');
const TwitchApi = require('node-twitch').default;
const {
    Client
} = require('pg');

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

    const elviBot = new Discord.Client();

    const MESSAGE_LIVE = 'Hey !!! Elvi est en LIVE sur Twitch ;) Regarde ça !';
    const MESSAGE_FIN = 'Oh non, le LIVE est terminé :( mais tu peux revoir le replay ici :';

    function fetchLive() {
        twitchV2.getStreams({
            channel: '23217261'
        }).then(res => {
            var stream = res.data.length != 0 ? res.data[0] : null;
            
            var serveur = elviBot.guilds.resolve('606951801731940352');
            if (serveur == null || !serveur.available) return;
            var canal = serveur.channels.resolve('607142584011325441');
            if (canal == null) return;

            // On récupére le dernier message du bot
            clientpg.query(`SELECT * FROM twitch WHERE channelID=23217261 AND serverid='606951801731940352';`)
                .then(query => {
                    var messageID = query.rows[0].messageid;

                    if (stream) {
                        twitchV2.getUsers('23217261')
                            .then(twitchUser => {

                                if (twitchUser.data.length == 0) return;

                                var user = twitchUser.data[0];

                                var now = Date.now()
                                var debut = new Date(stream.started_at)

                                var heures = Math.trunc(((now - debut) / 60000) / 60);
                                var minutes = Math.trunc((now - debut) / 60000 - heures * 60)

                                var embed = new Discord.MessageEmbed({
                                    "color": 9442302,
                                    "timestamp": stream.started_at,
                                    "title": "🔴 Elvi est en LIVE",
                                    "url": `https://www.twitch.tv/${user.login}`,
                                    "thumbnail": {
                                        "url": user.profile_image_url
                                    },
                                    "image": {
                                        "url": `https://static-cdn.jtvnw.net/ttv-boxart/${stream.game_name.split(" ").join("%20")}-272x380.jpg`
                                    },
                                    "footer": {
                                        "text": "Début"
                                    },
                                    "author": {
                                        "name": "Twitch",
                                        "url": `https://www.twitch.tv/${user.login}`,
                                        "icon_url": "https://cdn3.iconfinder.com/data/icons/social-messaging-ui-color-shapes-2-free/128/social-twitch-circle-512.png"
                                    },
                                    "fields": [{
                                            "name": "Status",
                                            "value": stream.title
                                        },
                                        {
                                            "name": "Jeu",
                                            "value": stream.game_name,
                                            "inline": true
                                        },
                                        {
                                            "name": "Durée",
                                            "value": `${heures} h ${minutes} min`,
                                            "inline": true
                                        },
                                        {
                                            "name": "Viewers",
                                            "value": stream.viewer_count,
                                            "inline": true
                                        }
                                    ]
                                });
                                if (messageID == "0") {
                                    canal.send("@everyone " + MESSAGE_LIVE + "\n<https://www.twitch.tv/mrelvilia>", {
                                            "embed": embed
                                        })
                                        .then(msg => {
                                            clientpg.query(`UPDATE twitch SET messageID = ${msg.id} WHERE channelID=23217261 AND serverid='606951801731940352';`)
                                                .catch(console.error);
                                        })
                                        .catch(console.error);
                                    canal.setName("📌en-live");
                                } else {
                                    canal.messages.fetch(messageID)
                                        .then(message => {
                                            message.edit("@everyone " + MESSAGE_LIVE + "\n<https://www.twitch.tv/mrelvilia>", {
                                                "embed": embed
                                            });
                                        })
                                        .catch(err => {
                                            if (err.code == 10008) {
                                                clientpg.query(`UPDATE twitch SET messageID = '0' WHERE channelID=23217261 AND serverid='606951801731940352';`)
                                            } else {
                                                console.error(err);
                                            }
                                        });
                                }
                            }).catch(console.error)
                    } else if (messageID != "0") {
                        canal.setName("📌annonces-stream");

                        clientpg.query(`UPDATE twitch SET messageID = '0' WHERE channelID=23217261 AND serverid='606951801731940352';`)
                            .catch(console.error);

                        twitchV2.getVideos({
                            user_id: '23217261',
                            type: 'archive'
                        }).then(video => {
                            video = video.data.length != 0 ? video.data[0] : null
                            canal.messages.fetch(messageID.toString())
                                .then(message => {
                                    if (message.embeds.length > 0) {
                                        var embed = message.embeds[0]
                                        embed.setTitle("LIVE terminé");
                                        embed.fields = embed.fields.filter(field => field.name != "Viewers");
                                        embed.setURL(video.url);
                                        message.edit(`${MESSAGE_FIN} <${video.url}>`, {
                                            "embed": embed
                                        });
                                    } else {
                                        message.edit(`${MESSAGE_FIN} <${video.url}>`);
                                    }
                                });
                        }).catch(console.error);
                    }

                })
                .catch(err => {
                    console.log("Erreur Postgres SELECT");
                    console.error(err);
                });
        }).catch(console.error);
    }

    elviBot.on('ready', () => {
        console.log(`Bot ${elviBot.user.tag} démarré !`);
        setInterval(fetchLive, 60000);
        fetchLive();
    });

    elviBot.login(process.env.ELVIBOT);

}