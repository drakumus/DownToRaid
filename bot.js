const Discord = require('discord.js');
const bot = new Discord.Client();
const secret = require('./secret.json');

const CONVERSATION_STATE = {
  START: 0,
  NAME: 1,
  DURATION: 2,
  DATE: 3,
  ROLES: 4,
  SPECIAL: 5,
  CONFIRM: 6,
  DONE: 7
}

const roles = {
  "🛡️": "Tank",
  "💚": "Druid",
  "💙": "Healbrand",
  "🧡": "Other Healer",
  "🔥": "Condi Dps",
  "💪": "Power Dps",
  "💨": "Quickness",
  "⏱️": "Alacrity",
  "❗": "Special Role 1",
  "❕": "Special Role 2",
  "‼️": "Special Role 3",
  "❓": "Learner"
}

const special = ['❗', '❕', '‼️'];

var special_role_count = 0;
var current_event = {
  roles: [],
  special: {},
}

bot.login(secret.bot.token);

bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', msg => {
  // check if in a conversation
  if(current_event.organizer && (msg.author.id === current_event.organizer.id))
  {
    haveConversation(msg.content);
  }
  // get the command
  let command_match = msg.content.match(/(?<=!)[a-zA-Z]+/g);
  if(command_match)
  {
    var command = command_match[0]; 
    if(msg.content.length > command.length+3) // +3 since we need to account for the !, space, and make sure there's something after
    {
      var params = msg.content.substring(command.length+2);
      console.log(params);
    }
    console.log(command);
  }
  // if the command exists it'll match a string
  switch(command)
  {
    case 'event':
      current_event.organizer = msg.author;
      current_event.channel = msg.channel;
      current_event.state = CONVERSATION_STATE.START
      haveConversation();
      break;
    case 'embed':
      let Embed = new Discord.MessageEmbed()
        .setTitle("Test Embed")
        .setDescription("Please react with your preferred role.")
        .setAuthor(msg.author.username, msg.author.avatarURL())
        .setColor(0xFF0000);
      for(const role in roles)
      {
        Embed.addField(`${role} ${roles[role]}`, "None", true);
      }
      Embed.addField(`People Coming`, "None", false);
      
      msg.channel.send(Embed).then(sentMsg => {
        sentMsg.react("🛡️");
        sentMsg.react("💚");
        sentMsg.react("💙");
        sentMsg.react("🧡");
        sentMsg.react("🔥");
        sentMsg.react("💪");
        sentMsg.react("💨");
        sentMsg.react("⏱️");
        sentMsg.react("❗");
        sentMsg.react("❕");
        sentMsg.react("‼️");
        sentMsg.react("❓");
      });
      break;
  }
});

bot.on('messageReactionAdd', (reaction, user) => {
  let message = reaction.message, emoji = reaction.emoji;

  // make sure we're only looking at reactions to the bot
  if(message.author.id === bot.user.id && (user.id !== bot.user.id) && message.embeds.length > 0)
  {
    let embed = message.embeds[0]
    if(embed.title/* && embed.title === "Test Embed"*/)
    {
      // get the role's field title, handle special case for special roles
      let role_title = `${emoji.name} ${roles[emoji.name]}`
      if(emoji.name === "❗"  || emoji.name === "❕" || emoji.name === "‼️")
      {
        role_title = `${emoji.name} ${current_event.special[emoji.name].value}`;
      }
      for(var field_index = 0; field_index < embed.fields.length; field_index++)
      {
        let field = embed.fields[field_index];
        if(field.name === role_title)
        {
          var role_field = field;
          break;
        }
      }
      if(role_field)
      {
        if(role_field.value === "None")
        {
          role_field.value = `<@${user.id}>`;
        } else
        {
          role_field.value += `\n<@${user.id}>`;
        }
        //embed.fields[field_index] = role_field;

        let attendance_field = embed.fields[embed.fields.length-1]
        if(!attendance_field.value.includes(`<@${user.id}>`))
        {
          if(attendance_field.value === "None")
          {
            attendance_field.value = `<@${user.id}>`;
          } else
          {
            attendance_field.value += `\n<@${user.id}>`;
          }
        }

        message.edit(embed);
      }
    }
  } else if(message.author.id === bot.user.id && (user.id !== bot.user.id) && message.content.includes("Please react to the roles you wish to offer from the following list")) {
    if(emoji.name === "✅")
    {
      haveConversation("done");
      return;
    }
    let role = roles[emoji.name]
    current_event.roles.push(emoji.name);
  }
})

function removeUserFromField(field_value, user)
{
  let user_index = field_value.indexOf(`<@${user.id}>`);
  if(user_index > -1)
  {
    if(user_index > 0)
    {
      // need to remove new line too
      field_value = field_value.replace(`\n<@${user.id}>`, "");
    } else
    {
      field_value = field_value.replace(`<@${user.id}>`, "");
    }
  }
  return field_value.length !== 0 ? field_value : "None";
}

bot.on('messageReactionRemove', (reaction, user) => {
  let message = reaction.message, emoji = reaction.emoji;
  if(message.author.id === bot.user.id && (user.id !== bot.user.id) && message.embeds.length > 0) {
    let embed = message.embeds[0];
    if(embed.title/* && embed.title === "Test Embed"*/) {
      // get the role's field title, handle special case for special roles
      let role_title = `${emoji.name} ${roles[emoji.name]}`
      if(emoji.name === "❗"  || emoji.name === "❕" || emoji.name === "‼️")
      {
        role_title = `${emoji.name} ${current_event.special[emoji.name].value}`;
      }
      let num_roles = 0;
      for(var field_index = 0; field_index < embed.fields.length; field_index++) {
        let field = embed.fields[field_index];
        if(field.name === role_title) {
          var role_field = field;
        }
        if(field.value.includes(`<@${user.id}>`)) {
          num_roles++;
        }
      }
      if(role_field) {
        role_field.value = removeUserFromField(role_field.value, user);
        // remove user who unreacted from attendance since the 1 role they had is being removed
        if(num_roles == 2) {
          let attendance_field = embed.fields[embed.fields.length-1];
          attendance_field.value = removeUserFromField(attendance_field.value, user);
        }
      }
    }
    message.edit(embed);
  } else if(message.author.id === bot.user.id && (user.id !== bot.user.id) && message.content.includes("Please react to the roles you wish to offer from the following list.")) {
    let role = roles[emoji.name]
    let index = current_event.roles.indexOf(emoji.name);
    if(index > 0) current_event.roles.splice(index, 1);
  }
})

function haveConversation(msg_contents)
{
  console.log(current_event.state)
  switch(current_event.state)
  {
    case CONVERSATION_STATE.START:
      current_event.organizer.send("Hi, welcome to event setup.\nPlease enter a name for your event");
      current_event.state = CONVERSATION_STATE.NAME;
      break;
    case CONVERSATION_STATE.NAME:
      current_event.organizer.send(`You've set the event name to: ${msg_contents}`);
      current_event.name = msg_contents;

      current_event.organizer.send("Please enter how long you plan the event to run for.");
      current_event.state = CONVERSATION_STATE.DURATION;
      break;
    case CONVERSATION_STATE.DURATION:
      current_event.organizer.send(`You've set the event duration to: ${msg_contents}`);
      current_event.duration = msg_contents;

      current_event.organizer.send("Please enter when this is happening relative to reset.");
      current_event.state = CONVERSATION_STATE.DATE;
      break;
    case CONVERSATION_STATE.DATE:
      current_event.organizer.send(`You've set the event date to: ${msg_contents}`);
      current_event.date = msg_contents;

      current_event.organizer.send("Please react to the roles you wish to offer from the following list. Once you're done react with ✅:\n\
        🛡️ tank\n\
        💚 Druid\n\
        💙 Healbrand\n\
        🧡 Other Healer\n\
        🔥 Condi Dps\n\
        💪 Power Dps\n\
        💨 Quickness\n\
        ⏱️ Alacrity\n\
        ❗ Special Role 1\n\
        ❕ Special Role 2\n\
        ‼️ Special Role 3\n\
        ❓ Learner").then(sentMsg => {
          sentMsg.react("🛡️");
          sentMsg.react("💚");
          sentMsg.react("💙");
          sentMsg.react("🧡");
          sentMsg.react("🔥");
          sentMsg.react("💪");
          sentMsg.react("💨");
          sentMsg.react("⏱️");
          sentMsg.react("❗");
          sentMsg.react("❕");
          sentMsg.react("‼️");
          sentMsg.react("❓");
          sentMsg.react("✅");
        });
      current_event.state = CONVERSATION_STATE.ROLES; 
      current_event.roles = []
      break;
    case CONVERSATION_STATE.ROLES:
      // most of the logic for this is in the reaction event
      if(msg_contents === "done") {
        current_event.state = CONVERSATION_STATE.SPECIAL;
        current_event.special = {}
        current_event.specials_to_set = 0;
        for(role of current_event.roles)
        {
          if(role === "❗"  || role === "❕" || role === "‼️")
          {
            current_event.special[role] = {
              'index': current_event.roles.indexOf(role),
              'value': "",
              'set this': false
            };
            current_event.specials_to_set++;
          }
        }
        haveConversation(); // progress to next prompt in next state
      }
      break;
    case CONVERSATION_STATE.SPECIAL:
      for(special_role in current_event.special)
      {
        let obj = current_event.special[special_role]
        if(obj['set this'])
        {
          current_event.special[special_role]['set this'] = false;
          current_event.special[special_role].value = msg_contents;
          current_event.specials_to_set--;
        }
        if(obj.value === "")
        {
          current_event.special[special_role]['set this'] = true;
          current_event.organizer.send(`What would you like ${special_role} ${roles[special_role]} to be called instead?`);
          break;
        }
      }
      
      if(current_event.specials_to_set === 0)
      {
        current_event.state = CONVERSATION_STATE.CONFIRM;
        haveConversation();
      }

      break;
    case CONVERSATION_STATE.CONFIRM:
      current_event.organizer.send("Please confirm the following message looks correct:");
      let Embed = new Discord.MessageEmbed()
        .setTitle(current_event.name)
        .setAuthor(current_event.organizer.username, current_event.organizer.avatarURL())
        .setDescription("React to select your preferred role.")
        .setColor(0xFF0000);
      Embed.addField("Date", `${current_event.date} for ${current_event.duration}`, false);
      for(role of current_event.roles)
      {
        let role_name = roles[role];
        if(role === "❗"  || role === "❕" || role === "‼️")
        {
          role_name = current_event.special[role].value;
        }
        Embed.addField(`${role} ${role_name}`, 'None', true)
      }
      Embed.addField(`People Coming`, "None", false);
      current_event.organizer.send("Posting your event now.")
      current_event.organizer.send(Embed);
      current_event.channel.send(Embed).then(sentMsg => {
        for(role of current_event.roles) {
          sentMsg.react(role);
        }
      });
      current_event.state = CONVERSATION_STATE.DONE;
      break;
  }
}
