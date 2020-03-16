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
            const profs = ['nicolas.garric@univ-jfc.fr', 'david.panzoli@univ-jfc.fr', 'laura.brillon@univ-jfc.fr', 'pierre.piccinini@ext.univ-jfc.fr', 'laurent.rouziere@ext.univ-jfc.fr'];

            if (mail.replyTo[0].address == "l2-info@listes.univ-jfc.fr" || profs.includes(mail.from[0].address)) {
                l2info = client.guilds.resolve('688085049912066057');
                if (l2info.available) {
        
                    const embed = new Discord.MessageEmbed()
                        .setColor('#ff542f')
                        .setTitle(mail.subject)
                        .setURL('https://scout.univ-toulouse.fr/')
                        .setAuthor(mail.from[0].name)
                        .setDescription(mail.text)
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

client.login(process.env.TOKEN);

