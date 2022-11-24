const fs = require('node:fs');
const path = require('node:path');
const schedule = require('node-schedule');
const { Client, Events, Collection, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { getFreeEPICGamesFormatted } = require('./bot-scripts/epic-free-games.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// call function only once after client is ready
client.once(Events.ClientReady, async () => {
	const rule = new schedule.RecurrenceRule();
	rule.dayOfWeek = 4;
	rule.hour = 9;
	rule.second = 0;
	rule.tz = 'America/Los_Angeles';

	schedule.scheduleJob(rule, async function(){
		try {
			let generalChannel = client.channels.cache.find(channel => channel.name.toLowerCase() === "general");
			await getFreeEPICGamesFormatted().then((message) => {generalChannel.send({ embeds: [new EmbedBuilder().setDescription(message).setTitle('EPIC Free Games')]});});
		} catch (error) {
			console.error(error);
		}
	});
});



client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	
  	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

if (process.env.NODE_ENV === 'production') {
	client.login(process.env.DISCORD_TOKEN);
} else {
	client.login(process.env.DISCORD_DEV_TOKEN);
}