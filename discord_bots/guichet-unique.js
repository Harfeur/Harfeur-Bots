const Discord = require('discord.js');
const fs = require('fs');

exports.run = async () => {

    var absents, channelID, memberID, playingChannel;
    var messageAppel = null;

    var appelData = {};
    var moveData = {};

    const guichetUnique = new Discord.Client();
    const moooove = new Discord.Client()

    guichetUnique.on('ready', () => {
        console.log(`Bot ${guichetUnique.user.tag} démarré !`);
    });

    guichetUnique.on('message', m => {
        if (m.author.bot) return;

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

        if (m.channel.id == '821038867645071442') {
            category = m.guild.channels.resolve('818488338205114378');
            guild = m.guild;

            permissions = [{
                    id: '722475696869343293',
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: m.member.id,
                    allow: ['VIEW_CHANNEL']
                }
            ];

            prof = m.member.roles.highest.id == '722475909902237819';

            if (m.mentions.members) {
                m.mentions.members.forEach(member => {
                    permissions.push({
                        id: member.id,
                        allow: ['VIEW_CHANNEL']
                    });
                    if (member.roles.highest.id == '722475909902237819') prof = true;
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

        if (m.content.startsWith('.random')) {
            m.delete();
            if (m.member.voice.channelID == null) {
                m.reply('Vous devez être connecté dans un canal vocal').then(msg => {
                    msg.delete({
                        timeout: 30000
                    })
                });
                return;
            }
            m.channel.send(`Lancement des dés ...`)
                .then(msg => {
                    setTimeout(() => {
                        msg.delete()
                        msg.channel.send(`Et c'est <@${m.member.voice.channel.members.random().id}> qui a été tiré au sort ! Bon courage ;)`);
                    }, 2000);
                });
        }

        if (m.content.startsWith('.move') && m.member.hasPermission('MOVE_MEMBERS')) {
            if (m.member.voice.channelID == null) {
                m.reply('Vous devez être connecté dans un canal vocal').then(msg => {
                    msg.delete({
                        timeout: 30000
                    })
                });
                return;
            }
            moveData[m.member.id] = {}
            m.reply('Recherche en cours ... Veuillez patienter').then(msg => {
                var count = 0;
                var membersToMove = [];

                function moveNow() {
                    msg.edit(`Déplacement en cours ... Veuillez patienter`);
                    var guild = moooove.guilds.resolve(m.guild.id);
                    var interv = setInterval(() => {
                        if (membersToMove.length == 0) {
                            clearInterval(interv);
                            msg.edit(`${count} étudiants déplacés`);
                            m.delete();
                            return;
                        }
                        var voice = membersToMove.pop();
                        var voice2;
                        if (membersToMove.length != 0 && guild)
                            voice2 = membersToMove.pop();
                        voice.setChannel(m.member.voice.channel, `Demande de ${m.member.displayName}`)
                        if (voice2)
                            guild.members.fetch(voice2.id)
                            .then(member => {
                                member.voice.setChannel(m.member.voice.channel, `Demande de ${m.member.displayName}`);
                            })
                            .catch(err => {
                                voice2.setChannel(m.member.voice.channel, `Demande de ${m.member.displayName}`)
                            });
                    }, 50);
                    moveData[m.member.id].channel = m.member.voice.channelID;
                }

                if (m.mentions.roles.size != 0) {
                    m.guild.members.fetch()
                        .then(members => {
                            members.each(member => {
                                m.mentions.roles.each(role => {
                                    if (member.roles.cache.find(role2 => role2.id == role.id) && member.voice.channelID != null && member.voice.channelID != m.member.voice.channelID) {
                                        membersToMove.push(member.voice);
                                        //member.voice.setChannel(m.member.voice.channel, `Demande de ${m.member.displayName}`);
                                        moveData[m.member.id][member.id] = member.voice.channelID;
                                        count++;
                                    }
                                });
                            });
                            moveNow();
                        });
                } else {
                    m.guild.members.fetch()
                        .then(members => {
                            members.each(member => {
                                if (member.voice.channelID != null && member.voice.channelID != m.member.voice.channelID) {
                                    membersToMove.push(member.voice);
                                    //member.voice.setChannel(m.member.voice.channel, `Demande de ${m.member.displayName}`);
                                    moveData[m.member.id][member.id] = member.voice.channelID;
                                    count++;
                                }
                            });
                            moveNow();
                        });
                }
            });

        }

        if (m.content.startsWith('.back') && m.member.hasPermission('MOVE_MEMBERS')) {
            if (moveData[m.member.id] == undefined) {
                m.reply('Vous n\'avez déplacé personne pour le moment');
                return;
            }

            m.reply('Recherche en cours ... Veuillez patienter').then(msg => {
                var count = 0;
                var membersToMove = [];

                function moveNow() {
                    msg.edit(`Renvoi dans le vocal d'origine en cours ... Veuillez patienter`);
                    var guild = moooove.guilds.resolve(m.guild.id);
                    var interv = setInterval(() => {
                        if (membersToMove.length == 0) {
                            clearInterval(interv);
                            msg.edit(`${count} étudiants déplacés dans leur canal d'origine`);
                            m.delete();
                            delete moveData[m.member.id];
                            return;
                        }
                        var voice = membersToMove.pop();
                        var voice2;
                        if (membersToMove.length != 0 && guild)
                            voice2 = membersToMove.pop();
                        voice.setChannel(moveData[m.member.id][voice.id], `Demande de ${m.member.displayName}`).catch(() => {});
                        if (voice2)
                            guild.members.fetch(voice2.id)
                            .then(member => {
                                member.voice.setChannel(moveData[m.member.id][voice.id], `Demande de ${m.member.displayName}`).catch(() => {});
                            })
                            .catch(() => {
                                voice2.setChannel(moveData[m.member.id][voice.id], `Demande de ${m.member.displayName}`).catch(() => {});
                            });
                    }, 50);
                }

                m.guild.channels.resolve(moveData[m.member.id].channel).members.each(member => {
                    if (moveData[m.member.id][member.id] != undefined)
                        membersToMove.push(member.voice);
                });
                moveNow()
            });
        }

        if (m.content.startsWith('.appel')) {
            arg = m.content.split(' ');
            if (arg[1] == 'cancel') {
                if (appelData[m.member.id] == undefined) {
                    m.reply("Vous n'avez pas lancé d'appel !")
                } else {
                    m.reply('L\'appel a été annulé');
                    appelData[m.member.id].message.delete()
                    delete appelData[m.member.id];
                }
                return;
            }
            if (m.member.voice.channelID == null) {
                m.reply('Vous devez être dans un Amphi pour exécuter cette commande');
                return;
            }
            if (appelData[m.member.id] != undefined) {
                m.reply('Désolé, vous avez déjà lancé un appel, veuillez attendre la fin');
                return;
            }
            if (m.mentions.roles.size == 0) {
                m.reply('Veuillez mentionner tous les rôles devant être présent au cours !\nVous pouvez utiliser @Groupe 1 @Groupe 2 @INFO @MATHS @DLMI');
                return;
            }

            appelData[m.member.id] = {
                absents: [],
                channel: m.member.voice.channelID
            };

            m.guild.members.fetch()
                .then(members => {
                    members.each(member => {
                        m.mentions.roles.each(role => {
                            if (member.roles.cache.find(role2 => role2.id == role.id) && member.voice.channelID != appelData[m.member.id].channel && !appelData[m.member.id].absents.includes(member.id))
                                appelData[m.member.id].absents.push(member.id);
                        });
                    });
                    var message = `Liste des élèves absents au cours de ${m.member.voice.channel.parent.name} de ${m.member} :`;
                    appelData[m.member.id].absents.forEach(member => {
                        message += `\n<@${member}>`;
                    });
                    message += `\n\nRejoignez le cours dans les 15 prochaines minutes pour être marqué présent.`;
                    m.channel.send(message)
                        .then(message => {
                            appelData[m.member.id].message = message
                        });

                    setTimeout(() => {
                        appelData[m.member.id].message.edit(appelData[m.member.id].message.content.replace("Rejoignez le cours dans les 15 prochaines minutes pour être marqué présent.", "L'appel est terminé"));
                        delete appelData[m.member.id];
                    }, 1000 * 60 * 15);
                });

        }

        if (m.content.startsWith('.poll')) {
            const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
            var arguments = m.content.split(' ');
            var nb = parseInt(arguments[1]);
            if (arguments.length >= 2 && !isNaN(nb)) {
                m.channel.send({
                    "embed": {
                      "title": "Sondage !",
                      "description": arguments.length >= 3 ? arguments.splice(2).join(' ') : 'Sondage sans titre',
                      "color": m.member.displayColor,
                      "timestamp": Date.now(),
                      "author": {
                        "name": m.member.displayName,
                        "icon_url": m.author.avatarURL()
                      }
                    }
                  })
                .then(msg => {
                    for (let index = 1; index <= nb && index <= 10; index++) {
                        msg.react(emojis[index]);
                    }
                    m.delete();
                });
            } else {
                m.reply('Veuillez préciser le nombre de valeurs : `.poll 3 nom_facultatif`');
            }
        }

        if (m.content.startsWith('.fermer') && m.channel.name.startsWith("ticket-")) {
            m.channel.delete("Suppression demandée par " + m.member.nickname);
        }
    });

    guichetUnique.on('voiceStateUpdate', (old, now) => {
        for (const [key, value] of Object.entries(appelData)) {
            if (now.channelID == value.channel) {
                if (value.absents.includes(now.member.id)) {
                    appelData[key].message.edit(value.message.content.replace(`\n<@${now.member.id}>`, ""));
                    appelData[key].absents.splice(value.absents.indexOf(now.member.id), 1);
                }
                break;
            }
        }
    });

    guichetUnique.login(process.env.GUICHET_UNIQUE);
    moooove.login(process.env.MOOOOVE);
}