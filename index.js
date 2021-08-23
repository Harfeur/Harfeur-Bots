if (process.argv[2] && process.argv[2] == "dev") require("custom-env").env();

require('./discord_bots/guichet-unique.js').run();
require('./discord_bots/elvibot.js').run();
require('./discord_bots/ehnvibot.js').run();
require('./discord_bots/twitchbot.js').run();

require('./twitch_bots/elvibot.js').run();
require('./twitch_bots/ehnvibot.js').run();