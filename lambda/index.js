const Alexa = require('ask-sdk-core');
require('dotenv').config();

let api;
const maxNoOfItemsReported = 5;

if (process.env.BACKEND === 'hass') {
  const HomeAssistant = require('./backends/home-assistant');
  api = new HomeAssistant();
} else if (process.env.BACKEND === 'kitchenowl') {
    const KitchenOwl = require('./backends/kitchenowl');
    api = new KitchenOwl();
} else {
  const ToDoList = require('./backends/to-do-list');
  api = new ToDoList();
}

let wasOpened = false;

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'
    );
  },
  handle(handlerInput) {
    wasOpened = true;
    const speakOutput = 'Here is your shopping list, what would you like to do?';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const AddItemIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddItemIntent'
    );
  },
  async handle(handlerInput) {
    let speakOutput;

    let item = Alexa.getSlotValue(handlerInput.requestEnvelope, 'item');
    item = item.charAt(0).toUpperCase() + item.slice(1); // Make first letter uppercase

    try {
      await api.create(item);
      speakOutput = `I have added ${item}.`;
      speakOutput += wasOpened ? ' Anything else?' : '';
    } catch (err) {
      speakOutput = 'Sorry, something went wrong.';
      console.error('Error adding item');
      console.error(err);
    }

    let rb = handlerInput.responseBuilder.speak(speakOutput);

    if (wasOpened) {
      rb = rb.reprompt('Anything else?');
    }

    return rb.getResponse();
  },
};

const ListItemsIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ListItemsIntent'
    );
  },
  async handle(handlerInput) {
    let speakOutput;

    try {
      const items = await api.list();
      const totalItemsAmount = items.length;

      const itemsToReportAmount = totalItemsAmount < maxNoOfItemsReported ? totalItemsAmount : maxNoOfItemsReported;
      const itemsToReport = items.slice(0, itemsToReportAmount).map((item) => item.name);

      if (totalItemsAmount === 0) {
        speakOutput = `The shopping list is empty.`;
      } else if (totalItemsAmount === 1) {
        speakOutput = `There is one item on your list: ${itemsToReport[0]}`;
      } else {
        const itemsListed = itemsToReport.slice(0, -1).join(', ') + ' and ' + itemsToReport.slice(-1);
        if (totalItemsAmount <= maxNoOfItemsReported) {
          speakOutput = `There are ${totalItemsAmount} items on your list: ${itemsListed}`;
        } else {
          speakOutput = `There are ${totalItemsAmount} items on your list. The last ${itemsToReportAmount} are: ${itemsListed}`;
        }
      }
      
    } catch (err) {
      speakOutput = 'Sorry, something went wrong.';
      console.error(err);
    }

    let rb = handlerInput.responseBuilder.speak(speakOutput);

    if (wasOpened) {
      rb = rb.reprompt('Anything else?');
    }

    return rb.getResponse();
  },
};

const ClearCompletedItemsIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ClearCompletedItemsIntent'
    );
  },
  async handle(handlerInput) {
    let speakOutput;

    try {
      await api.clear();
      speakOutput = 'List cleared';
    } catch (err) {
      speakOutput = 'Sorry, something went wrong.';
      console.error('Error clearing list');
      console.error(err);
    }

    let rb = handlerInput.responseBuilder.speak(speakOutput);

    if (wasOpened) {
      rb = rb.reprompt('Anything else?');
    }

    return rb.getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const speakOutput =
      'I can\'t help with that at the moment, sorry.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
       Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent' ||
       Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent')
    );
  },
  handle(handlerInput) {
    const speakOutput = 'See you later!';
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest'
    );
  },
  handle(handlerInput) {
    wasOpened = false;
    return handlerInput.responseBuilder.getResponse();
  },
};

const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
    );
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `You just triggered ${intentName}`;

    return (
      handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse()
    );
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(`~~~~ Error handled: ${error.stack}`);
    const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    AddItemIntentHandler,
    ListItemsIntentHandler,
    ClearCompletedItemsIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
