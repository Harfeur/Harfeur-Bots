const Discord = require('discord.js');
const notifier = require('mail-notifier');
const fs = require('fs');

exports.run = async () => {

    const guichetUnique = new Discord.Client();

    guichetUnique.on('ready', () => {
        console.log(`Bot ${guichetUnique.user.tag} démarré !`);

        const imapInfo = {
            user: "inuc.mchourre",
            password: process.env.PASSMAIL,
            host: "imap-scout.univ-toulouse.fr",
            port: 993, // imap port
            tls: true, // use secure connection
            tlsOptions: {
                rejectUnauthorized: false
            }
        };

        const nInfo = notifier(imapInfo);

        nInfo.on('end', () => nInfo.start()) // session closed
            .on('connected', () => console.log("Connecté par mail"))
            .on('error', err => console.error(err))
            .on('mail', mail => {

                console.log(mail);

                if (mail.to != undefined) {
                    mail.to.forEach(addresse => {
                        if (addresse.address == "l2-info@listes.univ-jfc.fr") {
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
                        if (addresse.address == "l3-info@listes.univ-jfc.fr") {
                            l3info = guichetUnique.guilds.resolve('722475696869343293');
                            if (l3info.available && mail.text) {

                                const embed = new Discord.MessageEmbed()
                                    .setColor('#ff542f')
                                    .setTitle(mail.subject)
                                    .setURL('https://scout.univ-toulouse.fr/')
                                    .setAuthor(mail.from[0].name)
                                    .setDescription(mail.text.substring(0, 2048))
                                    .setThumbnail('https://authc.univ-toulouse.fr/assets/logos/old_unr-cb65b75066f2691ab0919abdfeb665b5.png')
                                    .setTimestamp(mail.date)
                                    .setFooter('Source : Mails Scout');

                                annonces = l3info.channels.resolve('722742314090364968');
                                annonces.send(embed);
                                if (mail.attachments != undefined) {
                                    mail.attachments.forEach(pj => {
                                        const attach = new Discord.MessageAttachment(pj.content, pj.fileName);
                                        annonces.send(attach);
                                    });
                                }
                            }
                        }
                    });

                }

            })
            .start();

        const imapPsycho = {
            user: "inuc.cperloff",
            password: process.env.PASSMAILPSYCHO,
            host: "imap-scout.univ-toulouse.fr",
            port: 993, // imap port
            tls: true, // use secure connection
            tlsOptions: {
                rejectUnauthorized: false
            }
        };

        const nPsycho = notifier(imapPsycho);

        nPsycho.on('end', () => nPsycho.start()) // session closed
            .on('connected', () => console.log("Connecté par mail"))
            .on('error', err => console.error(err))
            .on('mail', mail => {

                console.log(mail);

                var roles = "";

                if (mail.to != undefined) {
                    mail.to.forEach(adresse => {
                        if (adresse.address == "l2-psycho@listes.univ-jfc.fr") roles += '<@&707597000664809574> ';
                        if (adresse.address == "l1-psycho@listes.univ-jfc.fr") roles += '<@&707596853046280242> ';
                        if (adresse.address == "l3-psycho@listes.univ-jfc.fr") roles += '<@&707597083833663571> ';
                    });
                    var psycho = guichetUnique.guilds.resolve('707584901557256232');
                    if (roles != "" && psycho.available && mail.text) {

                        const embed = new Discord.MessageEmbed()
                            .setColor('#ff542f')
                            .setTitle(mail.subject)
                            .setURL('https://scout.univ-toulouse.fr/')
                            .setAuthor(mail.from[0].name)
                            .setDescription(mail.text.substring(0, 2048))
                            .setThumbnail('https://authc.univ-toulouse.fr/assets/logos/old_unr-cb65b75066f2691ab0919abdfeb665b5.png')
                            .setTimestamp(mail.date)
                            .setFooter('Source : Mails Scout');

                        var annonces = psycho.channels.resolve('707646399302598687');
                        annonces.send(roles, {
                            embed: embed
                        });
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
            iEnd = m.content.indexOf('```', iStart + 3);

            if (iEnd != -1) {
                var code = "# -*- coding: utf-8 -*-\n" + m.content.substring(iStart + 6, iEnd);

                var allText = "";

                var spawn = require("child_process").spawn;

                var file = './' + Math.trunc(Math.random() * 1000) + '.py';

                fs.writeFile(file, code, () => {
                    var proc = spawn('python3', [file]);

                    proc.stdout.on('data', function (data) {
                        allText += data.toString();
                        m.reply("```\n" + data.toString() + "\n```");
                    });

                    proc.stderr.on('data', function (data) {
                        allText += data.toString();
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
            iEnd = m.content.indexOf('```', iStart + 3);

            if (iEnd != -1) {
                var code = m.content.substring(iStart + 6, iEnd);

                var spawn = require("child_process").spawn;

                var file = './' + Math.trunc(Math.random() * 1000) + '.sh';

                fs.writeFile(file, code, () => {
                    var proc = spawn('bash', [file]);

                    proc.stdout.on('data', function (data) {
                        m.reply("```\n" + data.toString() + "\n```");
                    });

                    proc.stderr.on('data', function (data) {
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
            listeDemandes.send("Demande de <@" + m.author.id + ">");
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
                        msg.delete({
                            timeout: 20000
                        })
                    });
                m.delete({
                    timeout: 10000
                });
                return;
            }

            guild.channels.create("ticket-" + Math.trunc(Math.random() * 1000), {
                parent: category,
                permissionOverwrites: permissions
            }).then(channel => {
                welcome = "Pour ajouter un utilisateur dans ce ticket, mentionez le ailleurs en mentionnant ce canal.\n";
                welcome += "Pour fermer et supprimer le ticket, faites `.fermer`\n";
                welcome += "Bon travail !";
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
                        msg.delete({
                            timeout: 60000
                        })
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

    guichetUnique.login(process.env.GUICHET_UNIQUE);
}