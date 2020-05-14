if (process.argv[2] && process.argv[2] == "dev") require("custom-env").env();

const Discord = require('discord.js');
const twitch = require('twitch-api-v5');

/**
 * Guichet Unique
 */

const guichetUnique = new Discord.Client();
const notifier = require('mail-notifier');
const fs = require('fs');

process
    .on('SIGTERM', shutdown('SIGTERM'))
    .on('SIGINT', shutdown('SIGINT'))
    .on('uncaughtException', shutdown('uncaughtException'));

function shutdown(signal) {
    return (err) => {
        console.log(`${ signal }...`);
        guichetUnique.users.resolve('327939742840913921').send('Arrêt en cours');
        if (err.name != undefined) {
            console.error(err.stack || err);
            guichetUnique.users.resolve('327939742840913921').send(`Erreur : ${err.name} \`\`\`${err.message}\`\`\``);
        }
        setTimeout(() => {
            console.log('...waited 5s, exiting.');
            process.exit(err.name != undefined ? 1 : 0);
        }, 5000).unref();
    };
}


guichetUnique.on('ready', () => {
    console.log(`Logged in as ${guichetUnique.user.tag}!`);
    guichetUnique.users.resolve('327939742840913921').send('Bot démarré');

    const imap = {
        user: "inuc.mchourre",
        password: process.env.PASSMAIL,
        host: "imap-scout.univ-toulouse.fr",
        port: 993, // imap port
        tls: true, // use secure connection
        tlsOptions: {
            rejectUnauthorized: false
        }
    };

    const n = notifier(imap);

    n.on('end', () => n.start()) // session closed
        .on('connected', () => console.log("Connecté par mail"))
        .on('error', err => console.error(err))
        .on('mail', mail => {

            console.log(mail);
            const profs = ['ne.pas.repondre@univ-jfc.fr', 'nicolas.garric@univ-jfc.fr', 'david.panzoli@univ-jfc.fr', 'laura.brillon@univ-jfc.fr', 'pierre.piccinini@ext.univ-jfc.fr', 'laurent.rouziere@ext.univ-jfc.fr'];

            if (profs.includes(mail.from[0].address) || mail.replyTo != undefined && mail.replyTo[0].address == "l2-info@listes.univ-jfc.fr") {
                l2info = guichetUnique.guilds.resolve('688085049912066057');
                if (l2info.available && mail.text) {

                    const embed = new Discord.MessageEmbed()
                        .setColor('#ff542f')
                        .setTitle(mail.subject)
                        .setURL('https://scout.univ-toulouse.fr/')
                        .setAuthor(mail.from[0].name)
                        .setDescription(mail.text.substring(0, 2048))
                        .setThumbnail('https://authc.univ-toulouse.fr/assets/logos/old_unr-cb65b75066f2691ab0919abdfeb665b5.png')
                        .setTimestamp(mail.date)
                        .setFooter('Source : Mails Scout');

                    annonces = l2info.channels.resolve('688086710948724829');
                    annonces.send(embed);
                    if (mail.attachments != undefined) {
                        mail.attachments.forEach(pj => {
                            const attach = new Discord.MessageAttachment(pj.content, pj.fileName);
                            annonces.send(attach);
                        });
                    }
                }
            }

        })
        .start();
});

guichetUnique.on('message', m => {
    if (m.author.bot) return;

    if (m.content.toLowerCase().includes('```py')) {
        iStart = m.content.toLowerCase().indexOf('```py');
        iEnd = m.content.indexOf('```', iStart+3);
        
        if (iEnd != -1) {
            var code = "# -*- coding: utf-8 -*-\n" + m.content.substring(iStart+6, iEnd);

            var allText = "";
            
            var spawn = require("child_process").spawn;

            var file = './' + Math.trunc(Math.random()*1000) + '.py';
    
            fs.writeFile(file, code, () => {
                var proc = spawn('python3',[file]);

                proc.stdout.on('data', function(data) { 
                    allText+=data.toString();
                    m.reply("```\n" + data.toString() + "\n```");
                });
                
                proc.stderr.on('data', function(data) {
                    allText+=data.toString();
                    m.reply("```\n" + data.toString() + "\n```");
                });

                proc.on('disconnect', () => {
                    console.log(allText);
                })
            });
        }
    }

    if (m.content.toLowerCase().includes('```sh')) {
        iStart = m.content.toLowerCase().indexOf('```sh');
        iEnd = m.content.indexOf('```', iStart+3);
        
        if (iEnd != -1) {
            var code = m.content.substring(iStart+6, iEnd);
            
            var spawn = require("child_process").spawn;

            var file = './' + Math.trunc(Math.random()*1000) + '.sh';
    
            fs.writeFile(file, code, () => {
                var proc = spawn('bash',[file]);

                proc.stdout.on('data', function(data) { 
                    m.reply("```\n" + data.toString() + "\n```");
                });
                
                proc.stderr.on('data', function(data) {
                    m.reply("```\n" + data.toString() + "\n```");
                });
            });
        }
    }

    if (m.content.toLowerCase().includes('panzoli')) {
        m.react('690536057887785010');
    }

    if (m.channel.id == '690114667368284171') {
        listeDemandes = m.guild.channels.resolve('690115414315106385');
        listeDemandes.send("Demande de <@" + m.author.id +">");
        listeDemandes.send(m.content)
        if (m.attachments.size != 0) {
            m.attachments.forEach(a => {
                listeDemandes.send(a);
            });
        }
        m.delete();
        m.author.send("Demande envoyée avec succès");
    }

    if (m.channel.id == '691579546780172288') {
        category = m.guild.channels.resolve('691597907941392455');
        guild = m.guild;

        permissions = [{
                id: '688085049912066057',
                deny: ['VIEW_CHANNEL']
            },
            {
                id: m.member.id,
                allow: ['VIEW_CHANNEL']
            }
        ];

        prof = m.member.roles.highest.id == '688088073648472101';

        if (m.mentions.members) {
            m.mentions.members.forEach(member => {
                permissions.push({
                    id: member.id,
                    allow: ['VIEW_CHANNEL']
                });
                if (member.roles.highest.id == '688088073648472101') prof = true;
            });
        };

        if (!prof) {
            m.reply('Vous devez mentionner (avec @) au moins un enseignant. Une fois @ écrit, commencer à taper le nom, puis cliquez sur le résultat correspondant')
            .then(msg => {
                msg.delete({timeout:20000})
            });
            m.delete({timeout:10000});
            return;
        }

        guild.channels.create("ticket-" + Math.trunc(Math.random() * 1000), {
            parent: category,
            permissionOverwrites: permissions
        }).then(channel => {
            welcome = "Pour ajouter un utilisateur dans ce ticket, mentionez le ailleurs en mentionnant ce canal.\n";
            welcome+= "Pour fermer et supprimer le ticket, faites `.fermer`\n";
            welcome+= "Bon travail !";
            channel.send(welcome);

            acces = "Les personnes ayant actuellement accès à ce canal sont :";
            channel.members.forEach(member => {
                if (member.id != '327939742840913921' && !member.user.bot) {
                    acces += ` <@${member.id}>`;
                };
            });
            channel.send(acces);

            m.reply(`Nouveau ticket créé : <#${channel.id}>`)
            .then(msg => {
                msg.delete({timeout:60000})
            });
            m.delete();
        });
    };

    if (m.mentions.channels) {
        m.mentions.channels.forEach(channel => {
            if (channel.name.startsWith("ticket-")) {
                if (m.mentions.members) {
                    m.mentions.members.forEach(member => {
                        /*
                        permissions = channel.permissionOverwrites;
                        perm = new Discord.PermissionOverwrites(channel, {
                            id: member.id,
                            allow: ['VIEW_CHANNEL'],
                            type: "member"
                        });
                        permissions.set(member.id, perm)
                        channel.overwritePermissions(permissions);
                        */
                        channel.updateOverwrite(member, {
                            VIEW_CHANNEL: true
                        });
                        channel.send(`Bienvenue à <@${member.id}> sur le canal !`);
                    });
                };
            };
        });
    };

    if (m.content.startsWith('.move') && m.member.hasPermission('MOVE_MEMBERS')) {
        arg = m.content.split(' ');
        console.log(arg);
        if (arg.length != 3) return;
        m.guild.channels.resolve(arg[1]).members.forEach(member => {
            member.voice.setChannel(arg[2]);
        });
    }
    
    if (m.content.startsWith('.fermer') && m.channel.name.startsWith("ticket-")) {
        m.channel.delete("Suppression demandée par " + m.member.nickname);
    }
});

guichetUnique.login(process.env.TOKEN);

/**
 * Partie du ElviBot
 */

twitch.clientID = 'yjqm4c8rqqhot9stewszikp7z98jz3';

const elviBot = new Discord.Client();

twitch.streams.channel({
    channelID: '23217261'
}, (err, res) => {
    console.log(res);
});

function fetchLive() {
    twitch.streams.channel({
        channelID: '23217261'
    }, (err, res) => {
        if (err) {
            console.error(err);
        } else {
            var serveur = elviBot.guilds.resolve('637315966631542801');
            var canal = serveur.channels.resolve('637315966631542809');

            if (res.stream != null) {
                now = Date.now()
                debut = new Date(res.stream.created_at)

                var embed = new Discord.MessageEmbed({
                    "color": 9442302,
                    "timestamp": res.stream.created_at,
                    "title": "Elvi est en LIVE",
                    "url": res.stream.channel.url,
                    "thumbnail": {
                        "url": res.stream.channel.logo
                    },
                    "footer": {
                        "text": "Depuis"
                    },
                    "image": {
                        "url": res.stream.preview.large
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
                            "name": "Viewers",
                            "value": res.stream.viewers,
                            "inline": true
                        }
                    ]
                });

                if (now - debut < 200000) {
                    //canal.send(`@everyone Elvi est en LIVE !! Aujourd'hui, c'est ${res.stream.game} !! Allez, je vous file le lien : ${res.stream.channel.url}`);
                    canal.send("@everyone Hey ! Elvi est en LIVE sur Twitch ;) Regarde ça !\n<https://www.twitch.tv/mrelvilia>", {
                        "embed": embed
                    });
                    canal.setName("📌en-live");
                } else {
                    canal.messages.fetch({
                        limit: 10
                    })
                    .then(messages => {
                        for (let index = 0; index < messages.array().length; index++) {
                            const message = messages.array()[index];
                            if (message.author.id == elviBot.user.id) {
                                message.edit("@everyone Hey !!! Elvi est en LIVE sur Twitch ;) Regarde ça !\n<https://www.twitch.tv/mrelvilia>", {
                                    "embed": embed
                                });
                                break;
                            }
                        }
                    })
                    .catch(console.error);
                }
                elviBot.user.setPresence({
                    activity: {
                        name: "Elvi est en LIVE",
                        type: "STREAMING",
                        url: res.stream.channel.url
                    }
                });
            } else {
                if (canal.name.includes("en-live")) {
                    canal.setName("📌annonces-stream");
                    canal.send("Oh non, le LIVE est terminé :( mais tu peux revoir tous les replays ici : <https://www.twitch.tv/mrelvilia/videos>")
                    elviBot.user.setPresence(null);
                }
            }
        }
    });
}

elviBot.on('ready', () => {
    console.log("Bot démarré");
    setInterval(() => {
        fetchLive();
    }, 200000);
});

elviBot.on('message', message => {
    if (message.author.bot) return;
    message.reply("Recu");
});

elviBot.login(process.env.ELVIBOT);