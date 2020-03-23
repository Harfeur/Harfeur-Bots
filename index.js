if (process.argv[2] && process.argv[2] == "dev") require("custom-env").env();

const Discord = require('discord.js');
const client = new Discord.Client();
const notifier = require('mail-notifier');

process
    .on('SIGTERM', shutdown('SIGTERM'))
    .on('SIGINT', shutdown('SIGINT'))
    .on('uncaughtException', shutdown('uncaughtException'));

function shutdown(signal) {
    return (err) => {
        console.log(`${ signal }...`);
        client.users.resolve('327939742840913921').send('Arrêt en cours');
        if (err.name != undefined) {
            console.error(err.stack || err);
            client.users.resolve('327939742840913921').send(`Erreur : ${err.name} \`\`\`${err.message}\`\`\``);
        }
        setTimeout(() => {
            console.log('...waited 5s, exiting.');
            process.exit(err.name != undefined ? 1 : 0);
        }, 5000).unref();
    };
}


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.users.resolve('327939742840913921').send('Bot démarré');

    const imap = {
        user: "inuc.mchourre",
        password: "M@ximeC@mille31530",
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
                l2info = client.guilds.resolve('688085049912066057');
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

client.on('message', m => {
    if (m.author.bot) return;

    if (m.content.toLowerCase().indexOf('panzoli') != -1) {
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
                        channel.permissionOverwrites.push({
                            id: member.id,
                            allow: ['VIEW_CHANNEL']
                        });
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

client.login(process.env.TOKEN);