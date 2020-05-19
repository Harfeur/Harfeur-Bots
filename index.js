if (process.argv[2] && process.argv[2] == "dev") require("custom-env").env();

process
    .on('SIGTERM', shutdown('SIGTERM'))
    .on('SIGINT', shutdown('SIGINT'))
    .on('uncaughtException', shutdown('uncaughtException'));

function shutdown(signal) {
    return (err) => {
        console.log(`${ signal }...`);
        if (err.name != undefined) {
            console.error(err.stack || err);
        }
        setTimeout(() => {
            console.log('...waited 5s, exiting.');
            process.exit(err.name != undefined ? 1 : 0);
        }, 5000).unref();
    };
}

require('./discord_bots/guichet-unique.js').run();
require('./discord_bots/elvibot.js').run();

require('./twitch_bots/elvibot.js').run();