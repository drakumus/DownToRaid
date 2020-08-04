const Discord = require('discord.js');
const bot = new Discord.Client();
const secret = require('./secret.json');
const runes = require('runes');

const CONVERSATION_STATE = {
  START: 0,
  NAME: 1,
  DURATION: 2,
  DATE: 3,
  ROLES: 4,
  SPECIAL: 5,
  SEND: 6,
  DONE: 7,
  CHOOSE_WINGS: 8,
  WING_CHOSEN: 9,
  SEND_WINGS: 10,
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
  "❓": "Learner",
  "1️⃣": "Wing 1",
  "2️⃣": "Wing 2",
  "3️⃣": "Wing 3",
  "4️⃣": "Wing 4",
  "5️⃣": "Wing 5",
  "6️⃣": "Wing 6",
  "7️⃣": "Wing 7",
  "🇸": "Strikes",
}

const special = ['❗', '❕', '‼️'];

var tracked_events = {

}

var tracked_wings = {

}

bot.login(secret.bot.token);

bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', msg => {
  // check if in a conversation with person
  if((msg.author.id in tracked_events) && (msg.channel instanceof Discord.DMChannel))
  {
    haveConversation(tracked_events[msg.author.id], msg.content);
  } else if((msg.author.id in tracked_wings) && (msg.channel instanceof Discord.DMChannel))
  {
    haveConversation(tracked_wings[msg.author.id], msg.content)
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
      tracked_events[msg.author.id] = {
        organizer: msg.author,
        channel: msg.channel,
        state: CONVERSATION_STATE.START,
        roles: [],
        special: {}
      }
      haveConversation(tracked_events[msg.author.id]);
      break;
    case 'interest':
      tracked_wings[msg.author.id] = {
        organizer: msg.author,
        channel: msg.channel,
        state: CONVERSATION_STATE.CHOOSE_WINGS,
        wings: []
      }
      haveConversation(tracked_wings[msg.author.id], null, false);
    break;
    case 'embed': // test command
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

function getEventFromAuthorID(message_author_id)
{
  // find the current event
  if(message_author_id in tracked_events)
  {
    return tracked_events[message_author_id];
  }
  console.log("Error! Author ID does not match any currently tracked events");
  return null;
}

function getEventFromAuthorUsername(message_author_username)
{
  for(var author in tracked_events)
  {
    let event = tracked_events[author];
    if(message_author_username === event.organizer.username)
    {
      return event;
    }
  }
  console.log("Error! Username doesn't match any currently tracked events");
  return null;
}

function getWingsFromAuthorID(message_author_id)
{
  if(message_author_id in tracked_wings)
  {
    return tracked_wings[message_author_id];
  }
  console.log("Error! Author ID does not match any currently tracked events");
  return null;
}

function getWingsFromAuthorUsername(message_author_username)
{
  for(var author in tracked_wings)
  {
    let wings = tracked_wings[author];
    if(message_author_username === wings.organizer.username)
    {
      return wings;
    }
  }
  console.log("Error! Username doesn't match any currently tracked events");
  return null;
}

function addUserFromField(field_value, user_id, is_attendance = false)
{
  if(!is_attendance || (is_attendance && !field_value.includes(`<@${user_id}>`)))
  {
    if(field_value === "None")
    {
      field_value = `<@${user_id}>`;
    } else
    {
      field_value += `\n<@${user_id}>`;
    }
  }

  if(is_attendance)
  {
    let attendees = field_value.split('\n');
    if(attendees.length === 11)
    {
      attendees.splice(10, 0, '---Subs---');
    }
    field_value = attendees.join('\n');
  }
  return field_value;
}

bot.on('messageReactionAdd', (reaction, user) => {
  let message = reaction.message, emoji = reaction.emoji;

  // make sure we're only looking at reactions to the bot
  if(message.author.id === bot.user.id && (user.id !== bot.user.id) && message.embeds.length > 0)
  {
    let is_event = !(message.embeds[0].title.includes("🔎 Interest Check 🔎"));
    let embed = message.embeds[0]
    if(is_event)
    {
      let current_event = getEventFromAuthorUsername(message.embeds[0].author.name);
      if(current_event === null) return;

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
        role_field.value = addUserFromField(role_field.value, user.id, false);
        embed.fields[embed.fields.length-1].value = addUserFromField(embed.fields[embed.fields.length-1].value, user.id, true);
      }
    } else
    {
      let embed = message.embeds[0]
      let current_event = getWingsFromAuthorUsername(message.embeds[0].author.name);
      if(current_event === null) return;

      for(var field_index = 0; field_index < embed.fields.length-1; field_index++)
      {
        let emoji = runes.substr(embed.fields[field_index].name, 0, 1);
        let count = message.reactions.cache.get(emoji).count - 1;
        embed.fields[field_index].value = count;
      }
      let attendance_field = embed.fields[embed.fields.length-1]
      attendance_field.value = addUserFromField(attendance_field.value, user.id, true);
    }
    message.edit(embed);
  } else if(message.author.id === bot.user.id && (user.id !== bot.user.id)) {
    let is_event = message.content.includes("Please react to the roles you wish to offer from the following list.");
    if(is_event)
    {
      // this is for event setup
      let current_event = getEventFromAuthorID(user.id);
      if(current_event === null) return;

      if(emoji.name === "✅")
      {
        haveConversation(current_event, "done");
        return;
      }
      current_event.roles.push(emoji.name);
    } else // interest check
    {
      let current_wings = getWingsFromAuthorID(user.id);
      if(current_wings === null) return;
      if(emoji.name === "✅")
      {
        haveConversation(current_wings, "done");
        return;
      }
      current_wings.wings.push(emoji.name);
    }
  }
})

function removeUserFromField(field_value, user, is_attendance = false)
{
  let attendees = field_value.split("\n");
  let user_index = attendees.indexOf(`<@${user.id}>`);
  if(user_index > -1)
  {
    attendees.splice(user_index, 1);
    if(is_attendance && attendees.length === 11) // including subs
    {
      let sub_index = attendees.indexOf("---Subs---");
      attendees.splice(sub_index, 1);
    } else if(is_attendance && user_index < 10 && attendees.length > 11) // move the ---Subs--- field if someone below it is no longer signed up
    {
      let sub_index = attendees.indexOf("---Subs---");
      attendees.splice(sub_index, 1);
      attendees.splice(10, 0, '---Subs---');
    }
    field_value = attendees.join("\n");
  }
  return field_value.length !== 0 ? field_value : "None";
}

bot.on('messageReactionRemove', (reaction, user) => {
  let message = reaction.message, emoji = reaction.emoji;
  if(message.author.id === bot.user.id && (user.id !== bot.user.id) && message.embeds.length > 0) {
    let is_event = !(message.embeds[0].title.includes("🔎 Interest Check 🔎"));
    let embed = message.embeds[0];
    if(is_event)
    {
      let current_event = getEventFromAuthorUsername(message.embeds[0].author.name);
      if(current_event === null) return;
    
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
        if(num_roles == 2) { // remove user if they're about to be removed from their last reacted
          let attendance_field = embed.fields[embed.fields.length-1];
          attendance_field.value = removeUserFromField(attendance_field.value, user, true);
        }
      }
    } else // interest check
    {
      let current_event = getWingsFromAuthorUsername(message.embeds[0].author.name);
      if(current_event === null) return;

      for(var field_index = 0; field_index < embed.fields.length-1; field_index++)
      {
        let emoji = runes.substr(embed.fields[field_index].name, 0, 1);
        let count = message.reactions.cache.get(emoji).count - 1;
        embed.fields[field_index].value = count;
      }
      const num_reacts = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id)).size;
      if(num_reacts == 0) { // remove user if they're about to be removed from their last reacted
        let attendance_field = embed.fields[embed.fields.length-1];
        attendance_field.value = removeUserFromField(attendance_field.value, user, true);
      }
    }
    message.edit(embed);
  } else if(message.author.id === bot.user.id && (user.id !== bot.user.id)) {
    let is_event = message.content.includes("Please react to the roles you wish to offer from the following list.");
    if(is_event)
    {
      // this is for event setup
      let current_event = getEventFromAuthorID(user.id);
      if(current_event === null) return;
      let index = current_event.roles.indexOf(emoji.name);
      if(index > 0) current_event.roles.splice(index, 1);
    } else // interest check
    {
      let current_wings = getWingsFromAuthorID(user.id);
      if(current_wings === null) return;
      let index = current_wings.wings.indexOf(emoji.name);
      if(index > 0) current_wings.wings.splice(index, 1);
    }
  }
})

function haveConversation(current_tracked, msg_contents)
{
  switch(current_tracked.state)
  {
    case CONVERSATION_STATE.START:
      current_tracked.organizer.send("Hi, welcome to event setup.\nPlease enter a name for your event");
      current_tracked.state = CONVERSATION_STATE.NAME;
      break;
    case CONVERSATION_STATE.NAME:
      current_tracked.organizer.send(`You've set the event name to: ${msg_contents}`);
      current_tracked.name = msg_contents;

      current_tracked.organizer.send(`Please enter how long you plan the event to run for. i.e. "2 hrs"`);
      current_tracked.state = CONVERSATION_STATE.DURATION;
      break;
    case CONVERSATION_STATE.DURATION:
      current_tracked.organizer.send(`You've set the event duration to: ${msg_contents}`);
      current_tracked.duration = msg_contents;

      current_tracked.organizer.send(`Please enter when this is happening. Tip: Make the time relative to reset i.e. enter "2hrs after reset"`);
      current_tracked.state = CONVERSATION_STATE.DATE;
      break;
    case CONVERSATION_STATE.DATE:
      current_tracked.organizer.send(`You've set the event date to: ${msg_contents}`);
      current_tracked.date = msg_contents;

      current_tracked.organizer.send("Please react to the roles you wish to offer from the following list. Once you're done react with ✅:\n\
        🛡️ Tank\n\
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
      current_tracked.state = CONVERSATION_STATE.ROLES; 
      current_tracked.roles = [];
      break;
    case CONVERSATION_STATE.ROLES:
      // most of the logic for this is in the reaction event
      if(msg_contents === "done") {
        current_tracked.state = CONVERSATION_STATE.SPECIAL;
        current_tracked.special = {}
        current_tracked.specials_to_set = 0;
        for(role of current_tracked.roles)
        {
          if(role === "❗"  || role === "❕" || role === "‼️")
          {
            current_tracked.special[role] = {
              'index': current_tracked.roles.indexOf(role),
              'value': "",
              'set this': false
            };
            current_tracked.specials_to_set++;
          }
        }
        haveConversation(current_tracked); // progress to next prompt in next state
      }
      break;
    case CONVERSATION_STATE.SPECIAL:
      for(special_role in current_tracked.special)
      {
        let obj = current_tracked.special[special_role]
        if(obj['set this'])
        {
          current_tracked.special[special_role]['set this'] = false;
          current_tracked.special[special_role].value = msg_contents;
          current_tracked.specials_to_set--;
        }
        if(obj.value === "")
        {
          current_tracked.special[special_role]['set this'] = true;
          current_tracked.organizer.send(`What would you like ${special_role} ${roles[special_role]} to be called instead?`);
          break;
        }
      }
      
      if(current_tracked.specials_to_set === 0)
      {
        current_tracked.state = CONVERSATION_STATE.SEND;
        haveConversation(current_tracked);
      }

      break;
    case CONVERSATION_STATE.SEND:
      let description = "React to select the roles you'd like to play.";
      if(current_tracked.roles.indexOf("❓") > 0)
      {
        description += "\nThis is a **learner friendly** raid! Feel free to react to roles you wish to learn on."
      } else
      {
        description += "\nThis is an **experienced** raid! No learner role is present, please sign up for roles you are experienced on."
      }
      let Embed = new Discord.MessageEmbed()
        .setTitle(current_tracked.name)
        .setAuthor(current_tracked.organizer.username, current_tracked.organizer.avatarURL())
        .setDescription(description)
        .setColor(0xaa00ff);
      Embed.addField("📅 Date", `${current_tracked.date}`, false);
      Embed.addField("⌛ Duration",  `${current_tracked.duration}`, false)
      for(role of current_tracked.roles)
      {
        let role_name = roles[role];
        if(role === "❗"  || role === "❕" || role === "‼️")
        {
          role_name = current_tracked.special[role].value;
        }
        Embed.addField(`${role} ${role_name}`, 'None', true)
      }
      Embed.addField(`People Coming`, "None", false);
      current_tracked.organizer.send("Posting your event now.")
      current_tracked.channel.send(Embed).then(sentMsg => {
        for(role of current_tracked.roles) {
          sentMsg.react(role);
        }
      });
      current_tracked.state = CONVERSATION_STATE.DONE;
      break;
    case CONVERSATION_STATE.CHOOSE_WINGS:
      current_tracked.organizer.send("Please react to the items you'd like to see if people are interested in. Once you're done react with ✅:\n\
      1️⃣ Wing 1\n\
      2️⃣ Wing 2\n\
      3️⃣ Wing 3\n\
      4️⃣ Wing 4\n\
      5️⃣ Wing 5\n\
      6️⃣ Wing 6\n\
      7️⃣ Wing 7\n\
      🇸 Strikes\n\
      ").then(sentMsg => {
        sentMsg.react("1️⃣");
        sentMsg.react("2️⃣");
        sentMsg.react("3️⃣");
        sentMsg.react("4️⃣");
        sentMsg.react("5️⃣");
        sentMsg.react("6️⃣");
        sentMsg.react("7️⃣");
        sentMsg.react("🇸");
        sentMsg.react("✅");
      });
      current_tracked.state = CONVERSATION_STATE.WING_CHOSEN; 
      current_tracked.wings = [];
      break;
    case CONVERSATION_STATE.WING_CHOSEN:
      if(msg_contents === "done") {
        current_tracked.state = CONVERSATION_STATE.SEND_WINGS;
        haveConversation(current_tracked);
      }
      break;
    case CONVERSATION_STATE.SEND_WINGS:
      let text = "React with one of the emojis below to show what content you're interested in doing."

      current_tracked.organizer.send("Publishing your selection.");
      let embed = new Discord.MessageEmbed()
        .setTitle("🔎 Interest Check 🔎")
        .setAuthor(current_tracked.organizer.username, current_tracked.organizer.avatarURL())
        .setDescription(text).setColor(0x00FFFF);
      for(wing of current_tracked.wings)
      {
        embed.addField(`${wing} ${roles[wing]}`, 0, false);
      }
      embed.addField(`People Interested`, "None", false);
      current_tracked.organizer.send(embed);
      current_tracked.channel.send(embed).then(sentMsg => {
        for(wing of current_tracked.wings) {
          sentMsg.react(wing);
        }
      });
      current_tracked.state = CONVERSATION_STATE.DONE;
      break;
  }
}
