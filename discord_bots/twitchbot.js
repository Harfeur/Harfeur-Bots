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

    const intents = [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.DirectMessages];
    const partials = [Discord.Partials.Channel];
    const twitchBot = new Discord.Client({intents:intents, partials:partials});

    function fetchLive() {
        clientpg.query('SELECT * FROM twitch LEFT JOIN guilds ON twitch.serverid = guilds.guild_id')
            .then(query => {
                const querySplice = [];
                while (query.rows.length) {
                    querySplice.push(query.rows.splice(0, 100));
                }
                querySplice.forEach(queries => {
                    const ids = queries.map(q => q.channelid);
                    twitchV2.getStreams({
                        channels: ids,
                        first: 100
                    }).then(resAll => {
                        queries.forEach(row => {
                            if (row.canalid === "0") return;

                            const messageID = row.messageid;
                            const messageLive = row.messagelive;
                            const messageFin = row.messagefin;
                            const channelid = row.channelid;
                            const canalid = row.canalid;
                            const serverid = row.serverid;
                            const lang = row.language ? row.language : "fr";

                            let stream = resAll.data.filter(stream => stream.user_id === channelid);
                            stream = stream.length !== 0 ? stream[0] : null

                            const serveur = twitchBot.guilds.resolve(serverid);
                            if (serveur == null || !serveur.available) return;
                            const canal = serveur.channels.resolve(canalid);
                            if (canal == null || !canal.permissionsFor(twitchBot.user).has([Discord.PermissionsBitField.Flags.SendMessages, Discord.PermissionsBitField.Flags.EmbedLinks])) return;

                            if (stream) {
                                twitchV2.getUsers(channelid)
                                    .then(twitchUser => {

                                        if (twitchUser.data.length === 0) return;

                                        const user = twitchUser.data[0];

                                        const now = Date.now();
                                        const debut = new Date(stream.started_at);

                                        const heures = Math.trunc(((now - debut) / 60000) / 60);
                                        const minutes = Math.trunc((now - debut) / 60000 - heures * 60);

                                        const embed = new Discord.EmbedBuilder()
                                            .setColor(9442302)
                                            .setTimestamp(new Date(stream.started_at))
                                            .setTitle("🔴 " + sprintf(translations[lang]["TITLE"], user.display_name))
                                            .setURL(`https://www.twitch.tv/${user.login}`)
                                            .setThumbnail(user.profile_image_url)
                                            .setImage(`https://static-cdn.jtvnw.net/ttv-boxart/${stream.game_name.split(" ").join("%20")}-272x380.jpg`)
                                            .setFooter({
                                                text: translations[lang]["START"]
                                            })
                                            .setAuthor({
                                                name: "Twitch",
                                                url: `https://www.twitch.tv/${user.login}`,
                                                icon_url: "https://cdn3.iconfinder.com/data/icons/social-messaging-ui-color-shapes-2-free/128/social-twitch-circle-512.png"
                                            })
                                            .setFields(
                                                {
                                                    name: translations[lang]["STATUS"],
                                                    value: `❯ ${stream.title}`
                                                },
                                                {
                                                    name: translations[lang]["GAME"],
                                                    value: `❯ ${stream.game_name}`,
                                                    inline: true
                                                },
                                                {
                                                    name: translations[lang]["LENGTH"],
                                                    value: "❯ " + sprintf(translations[lang]["LENGTH_TIME"], heures, minutes),
                                                    inline: true
                                                },
                                                {
                                                    name: translations[lang]["VIEWERS"],
                                                    value: `❯ ${stream.viewer_count}`,
                                                    inline: true
                                                });

                                        if (messageID === "0") {
                                            canal.send({
                                                content: `${messageLive}\n<https://www.twitch.tv/${user.login}>`,
                                                embeds: [embed]
                                            })
                                                .then(msg => {
                                                    clientpg.query(`UPDATE twitch SET messageID = '${msg.id}' WHERE channelID=${channelid} AND serverid='${serverid}';`)
                                                })
                                                .catch(console.error);
                                        } else {
                                            canal.messages.fetch(messageID)
                                                .then(message => {
                                                    message.edit({
                                                        content: `${messageLive}\n<https://www.twitch.tv/${user.login}>`,
                                                        embeds: [embed]
                                                    });
                                                })
                                                .catch(err => {
                                                    if (err.code === 10008) {
                                                        clientpg.query(`UPDATE twitch SET messageID = '0' WHERE channelID=${channelid} AND serverid='${serverid}';`)
                                                    } else {
                                                        console.error(err);
                                                    }
                                                })
                                        }
                                    })
                                    .catch(console.error)
                            } else if (messageID !== "0") {
                                clientpg.query(`UPDATE twitch SET messageID = '0' WHERE channelid=${channelid} AND serverid='${serverid}';`)
                                    .catch(console.error);

                                twitchV2.getVideos({
                                    user_id: channelid,
                                    type: "archive"
                                })
                                    .then(video => {
                                        video = video.data.length !== 0 ? video.data[0] : null
                                        canal.messages.fetch(messageID)
                                            .then(message => {
                                                let embed;
                                                if (!video) {
                                                    // Pas de redif
                                                    if (message.embeds.length > 0) {
                                                        embed = new Discord.EmbedBuilder(message.embeds[0]);
                                                        embed.setTitle(translations[lang]["LIVE_END"]);
                                                        embed.setFields(embed.data.data.fields.filter(field => field.name !== "Viewers"));
                                                        message.edit({
                                                            content: messageFin,
                                                            embeds: [embed]
                                                        }).catch(console.error);
                                                    } else {
                                                        message.edit(messageFin).catch(console.error);
                                                    }
                                                } else {
                                                    if (message.embeds.length > 0) {
                                                        embed = new Discord.EmbedBuilder(message.embeds[0]);
                                                        embed.setTitle(translations[lang]["LIVE_END"]);
                                                        embed.setFields(embed.data.data.fields.filter(field => field.name !== "Viewers"));
                                                        embed.setURL(video.url);
                                                        message.edit({
                                                            content: `${messageFin} <${video.url}>`,
                                                            embeds: [embed]
                                                        }).catch(console.error);
                                                    } else {
                                                        message.edit(`${messageFin} <${video.url}>`).catch(console.error);
                                                    }
                                                }
                                            }).catch(console.error);
                                    }).catch(console.error)
                            }
                        })
                    }).catch(console.error);
                });
            });
    }

    twitchBot.on('ready', () => {
        console.log(`Bot ${twitchBot.user.tag} démarré !`);
        setInterval(fetchLive, 90000);
        // fetchLive();
    });

    twitchBot.on('interactionCreate', async interaction => {
        if (!interaction.guild) {
            interaction.reply("Ce bot ne fonctionne que dans des serveurs pour le moment.\nThis bot only works with guilds for now.").catch(console.error);
            return;
        }

        clientpg.query(`SELECT language FROM guilds WHERE guild_id='${interaction.guild.id}'`)
            .then(query => {
                const lang = query.rowCount !== 0 ? query.rows[0].language : "fr"

                // VERIFY ADMIN
                if (!interaction.memberPermissions.has(Discord.PermissionsBitField.Flags.Administrator)) {
                    interaction.reply(translations[lang]["NO_RIGHTS"]).catch(console.error);
                    return;
                }
                if (interaction.type === Discord.InteractionType.ApplicationCommand)
                    switch (interaction.commandName) {
                        case "setup":
                            const inputStreamer = new Discord.TextInputBuilder()
                                .setCustomId("streamer")
                                .setLabel(translations[lang]["SETUP_STREAMER"])
                                .setStyle(1)
                                .setPlaceholder("harfeur")
                                .setRequired(true);
                            const inputStart = new Discord.TextInputBuilder()
                                .setCustomId("start")
                                .setLabel(translations[lang]["SETUP_START"])
                                .setStyle(2)
                                .setPlaceholder(translations[lang]["SETUP_START_PLACEHOLDER"])
                                .setRequired(true);
                            const inputEnd = new Discord.TextInputBuilder()
                                .setCustomId("end")
                                .setLabel(translations[lang]["SETUP_END"])
                                .setStyle(2)
                                .setPlaceholder(translations[lang]["SETUP_END_PLACEHOLDER"])
                                .setRequired(true);

                            const row1 = new Discord.ActionRowBuilder()
                                .addComponents(inputStreamer);
                            const row2 = new Discord.ActionRowBuilder()
                                .addComponents(inputStart);
                            const row3 = new Discord.ActionRowBuilder()
                                .addComponents(inputEnd);

                            const modal = new Discord.ModalBuilder()
                                .setTitle(translations[lang]["SETUP_TITLE"])
                                .setCustomId("modal_setup")
                                .addComponents(row1, row2, row3);

                            interaction.showModal(modal).catch(console.error);

                            break;

                        case "delete":
                            const guild = interaction.guild;
                            clientpg.query(`SELECT * FROM twitch WHERE serverid='${interaction.guild.id}';`)
                                .then(async query => {
                                    if (query.rowCount === 0) {
                                        interaction.reply(translations[lang]["DELETE_EMPTY"]).catch(console.error);
                                        return;
                                    }

                                    const menu = new Discord.SelectMenuBuilder()
                                        .setCustomId("select_delete")
                                        .setPlaceholder(translations[lang]["DELETE_CHOOSE_PLACEHOLDER"]);

                                    for (let i = 0; i < query.rowCount && i < 25; i++) {
                                        let q = query.rows[i];
                                        let user = await twitchV2.getUsers(q.channelid);
                                        menu.addOptions([{
                                            label: user.data[0].display_name,
                                            value: q.channelid,
                                            description: guild.channels.resolve(q.canalid)?.name ?? `Canal n°${q.canalid} introuvable`
                                        }])
                                    }

                                    const row = new Discord.ActionRowBuilder().addComponents(menu);

                                    interaction.reply({components: [row]}).catch(console.error);
                                });
                            break;

                        case "language":
                            const newLang = interaction.options.getString("locale");
                            clientpg.query(`INSERT INTO guilds(guild_id, language) VALUES (${interaction.guild.id},'${newLang}')
                            ON CONFLICT (guild_id) DO UPDATE SET language = '${newLang}';`)
                                .then(() => {
                                    interaction.reply(translations[newLang]["LANGUAGE_UPDATE"]).catch(console.error);
                                })
                                .catch(err => {
                                    interaction.reply(translations[newLang]["DATABASE_ERROR"]).catch(console.error);
                                    console.error(err);
                                })
                            break;
                    }
                else if (interaction.isSelectMenu()) {
                    switch (interaction.customId) {
                        case "select_delete":
                            clientpg.query(`DELETE FROM twitch WHERE channelid=${interaction.values[0]} AND serverid='${interaction.guild.id}';`)
                                .then(() => {
                                    interaction.update({
                                        content: translations[lang]["DELETE_SUCCESS"],
                                        components: []
                                    }).catch(console.error);
                                }).catch(err => {
                                    interaction.update({
                                        content: translations[lang]["DATABASE_ERROR"],
                                        components: []
                                    }).catch(console.error);
                                    console.error(err);
                                });
                            break;

                        default:
                            break;
                    }
                } else if (interaction.isModalSubmit()) {
                    switch (interaction.customId) {
                        case "modal_setup":
                            twitchV2.getUsers(interaction.fields.getTextInputValue("streamer"))
                                .then(res => {
                                    if (!res.data || res.data.length === 0) {
                                        interaction.reply(translations[lang]["SETUP_NO_RESULT"]).catch(console.error);
                                    } else {
                                        let channelID, messageLIVE, messageFIN;
                                        console.log("Enregistrement en cours d'un nouveau streameur");

                                        let userId = res.data[0].id;
                                        clientpg.query(`SELECT * FROM twitch WHERE channelid=${userId} AND serverid='${interaction.guild.id}';`)
                                            .then(query => {
                                                if (query.rowCount !== 0) {
                                                    interaction.reply(translations[lang]["SETUP_ALREADY"]).catch(console.error);
                                                } else {
                                                    if (!interaction.channel.permissionsFor(twitchBot.user).has([Discord.PermissionsBitField.Flags.SendMessages, Discord.PermissionsBitField.Flags.EmbedLinks])) {
                                                        interaction.reply(translations[lang]["SETUP_NO_PERMISSIONS"]).catch(console.error);
                                                    } else {
                                                        channelID = interaction.channel.id;
                                                        messageLIVE = interaction.fields.getTextInputValue("start").replaceAll("'", "''");
                                                        messageFIN = interaction.fields.getTextInputValue("end").replaceAll("'", "''");

                                                        clientpg.query(`INSERT INTO twitch(channelid, serverid, canalid, messagelive, messagefin) VALUES (${userId}, '${interaction.guild.id}', '${channelID}', '${messageLIVE}', '${messageFIN}');`)
                                                            .then(() => {
                                                                interaction.reply(translations[lang]["SETUP_SUCCESS"]).catch(console.error);
                                                            })
                                                            .catch(err => {
                                                                interaction.reply(translations[lang]["DATABASE_ERROR"]).catch(console.error);
                                                                console.error(err);
                                                            });
                                                    }
                                                }
                                            });
                                    }
                                }).catch(err => {
                                    interaction.reply(translations[lang]["DATABASE_ERROR"]).catch(console.error);
                                    console.error(err);
                                });
                            break;

                        default:
                            break;
                    }
                }
            }).catch(err => {
                interaction.reply(translations["fr"]["DATABASE_ERROR"] + " / " + translations["en"]["DATABASE_ERROR"]).catch(console.error);
                console.error(err);
            });
    });

    twitchBot.login(process.env.TWITCHBOT).catch(console.error);
}