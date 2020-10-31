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

    const elviBot = new Discord.Client();

    twitch.clientID = process.env.TWITCH_APP;

    const MESSAGE_LIVE = 'Hey !!! Elvi est en LIVE sur Twitch ;) Regarde ça !';
    const MESSAGE_FIN = 'Oh non, le LIVE est terminé :( mais tu peux revoir le replay ici :';

    function fetchLive() {
        twitch.streams.channel({
            channelID: '23217261'
        }, (err, res) => {
            if (err) {
                console.error(err);
            } else {
                var serveur = elviBot.guilds.resolve('606951801731940352');
                if (serveur == null || !serveur.available) return;
                var canal = serveur.channels.resolve('607142584011325441');
                if (canal == null) return;

                // On récupére le dernier message du bot
                clientpg.query(`SELECT * FROM twitch WHERE channelID=23217261;`)
                    .then(res => {
                        var messageID = res.rows[0].messageid;
                        var message;
                        if (messageID != 0)
                            message = canal.messages.fetch(messageID.toString());
                        if (res.stream != null) {
                            var now = Date.now()
                            var debut = new Date(res.stream.created_at)

                            var heures = Math.trunc(((now - debut) / 60000) / 60);
                            var minutes = Math.trunc((now - debut) / 60000 - heures * 60)

                            var embed = new Discord.MessageEmbed({
                                "color": 9442302,
                                "timestamp": res.stream.created_at,
                                "title": "🔴 Elvi est en LIVE",
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
                            if (messageID == 0) {
                                canal.send("@everyone " + MESSAGE_LIVE + "\n<https://www.twitch.tv/mrelvilia>", {
                                        "embed": embed
                                    })
                                    .then(msg => {
                                        clientpg.query(`UPDATE twitch SET messageID = ${msg.id} WHERE channelID=23217261;`)
                                            .catch(console.error);
                                    });
                                canal.setName("📌en-live");
                            } else {
                                message.edit("@everyone " + MESSAGE_LIVE + "\n<https://www.twitch.tv/mrelvilia>", {
                                    "embed": embed
                                });
                            }
                            elviBot.user.setPresence({
                                activity: {
                                    name: "Elvi est en LIVE",
                                    type: "STREAMING",
                                    url: res.stream.channel.url
                                }
                            });
                        } else if (messageID != 0) {
                            canal.setName("📌annonces-stream");

                            clientpg.query(`UPDATE twitch SET messageID = 0 WHERE channelID=23217261;`)
                                .catch(console.error);

                            twitch.channels.videos({
                                channelID: '23217261',
                                limit: 1,
                                broadcast_type: 'archive'
                            }, (err, res2) => {
                                if (err) console.error(err);
                                else {
                                    if (message.embeds.length > 0) {
                                        var embed = message.embeds[0]
                                        embed.setTitle("LIVE terminé");
                                        embed.fields = embed.fields.filter(field => field.name != "Viewers");
                                        embed.setURL(res2.videos[0].url);
                                        message.edit(`${MESSAGE_FIN} <${res2.videos[0].url}>`, {
                                            "embed": embed
                                        });
                                    } else {
                                        message.edit(`${MESSAGE_FIN} <${res2.videos[0].url}>`);
                                    }

                                }
                            });
                            elviBot.user.setActivity(null);
                        }

                    })
                    .catch(err => {
                        console.log("Erreur Postgres SELECT");
                        console.error(err);
                    });
            }
        });
    }

    elviBot.on('ready', () => {
        console.log(`Bot ${elviBot.user.tag} démarré !`);
        setInterval(fetchLive, 120000);
        fetchLive();
    });

    elviBot.login(process.env.ELVIBOT);

}