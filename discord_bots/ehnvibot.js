const Discord = require('discord.js');
const TwitchApi = require('node-twitch').default;
const spotifyApi = require('../modules/spotify.js');
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

    const ehnvibot = new Discord.Client();

    const MESSAGE_LIVE = '<:subYo:742107078595969025> les potes, Ehnvi est là, Gogogo <:subLior:742106697933520946>';
    const MESSAGE_FIN = '';

    function fetchLive() {
        twitchV2.getStreams({
            channel: '31549669'
        }).then(res => {
            var stream = res.data.length != 0 ? res.data[0] : null;

            var serveur = ehnvibot.guilds.resolve('581148683358175233');
            if (serveur == null || !serveur.available) return;
            var canal = serveur.channels.resolve('587867579133984788');
            if (canal == null) return;

            clientpg.query(`SELECT * FROM twitch WHERE channelID=31549669 AND serverid='581148683358175233';`)
                .then(query => {
                    var messageID = query.rows[0].messageid;

                    if (stream) {
                        spotifyApi.updateSongList();
                        twitchV2.getUsers('31549669')
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
                                    "title": "🔴 Ehnvi est en LIVE",
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
                                    canal.send("@everyone " + MESSAGE_LIVE + "\n<https://www.twitch.tv/ehnvi_>", {
                                            "embed": embed
                                        })
                                        .then(msg => {
                                            clientpg.query(`UPDATE twitch SET messageID = ${msg.id} WHERE channelID=31549669 AND serverid='581148683358175233';`)
                                                .catch(console.error);
                                        });
                                    canal.setName("🚩en-live🚩");
                                } else {
                                    canal.messages.fetch(messageID)
                                        .then(message => {
                                            message.edit("@everyone " + MESSAGE_LIVE + "\n<https://www.twitch.tv/ehnvi_>", {
                                                "embed": embed
                                            });
                                        })
                                        .catch(err => {
                                            if (err.code == 10008) {
                                                clientpg.query(`UPDATE twitch SET messageID = '0' WHERE channelID=31549669 AND serverid='581148683358175233';`)
                                            } else {
                                                console.error(err);
                                            }
                                        });
                                }
                            }).catch(console.error);
                    } else if (messageID != "0") {
                        canal.setName("🚩annonces🚩");

                        clientpg.query(`UPDATE twitch SET messageID = '0' WHERE channelID=31549669 AND serverid='581148683358175233';`)
                            .catch(console.error);

                        twitchV2.getVideos({
                            user_id: '31549669',
                            type: 'archive'
                        }).then(video => {
                            if (err) console.error(err);
                            else {
                                video = video.data.length != 0 ? video.data[0] : null
                                canal.messages.fetch(messageID.toString())
                                    .then(message => {
                                        if (message.embeds.length > 0) {
                                            var embed = message.embeds[0]
                                            embed.setTitle("LIVE terminé");
                                            embed.fields = embed.fields.filter(field => field.name != "Viewers");
                                            embed.setURL(video.url);
                                            message.edit(`Oh non, le LIVE est terminé :( mais tu peux revoir le replay ici : <${video.url}>`, {
                                                "embed": embed
                                            });
                                        } else {
                                            message.edit(`Oh non, le LIVE est terminé :( mais tu peux revoir le replay ici : <${video.url}>`);
                                        }
                                    });

                            }
                        }).catch(console.error);
                    }
                })
                .catch(err => {
                    console.log("Erreur Postgres SELECT");
                    console.error(err);
                });
        });
    };

    ehnvibot.on('ready', () => {
        console.log(`Bot ${ehnvibot.user.tag} démarré !`);
        setInterval(fetchLive, 60000);
        fetchLive();
    });

    ehnvibot.login(process.env.EHNVIBOT);

}