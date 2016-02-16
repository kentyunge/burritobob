#!/usr/bin/env node

'use strict';

/**
 * Burritobob launcher script.
 *
 * @author Kent Yunge
 */

var BurritoBobBot = require('../lib/burritoBobBot');

/**
 * Environment variables used to configure the bot:
 *
 *  BOT_API_KEY : the authentication token to allow the bot to connect to your slack organization. You can get your
 *      token at the following url: https://<yourorganization>.slack.com/services/new/bot (Mandatory)
 *  BOT_NAME: the username you want to give to the bot within your organisation.
 */
var token = process.env.BOT_API_KEY || require('../token');
var name = process.env.BOT_NAME;

var BurritoBobBot = new BurritoBobBot({
    token: token,
    name: name
});

BurritoBobBot.run();
