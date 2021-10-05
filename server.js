const stripe = require('stripe')('sk_test_51Jgqo6C24NcqpTPOlrLJ0sw7QbavTuwyhZeDB1FeKLrkw46QNdVxgyY5EROkuRol1QKIw8Km5W54W6RSTCx37OPh00tnxt7viy');
const express = require('express');
const app = express();
app.use(express.static('public'));

var currentCustomer = null;

const YOUR_DOMAIN = 'http://localhost:4242';

app.post('/create-checkout-session', async (req, res) => {
  console.log("Starting Session");
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: 'price_1JgqonC24NcqpTPOIeARtsST',
        quantity: 1,
      },
    ],
    payment_method_types: [
      'card',
    ],
    success_url: `${YOUR_DOMAIN}/success.html`,
    cancel_url: `${YOUR_DOMAIN}/cancel.html`,
  });

  res.redirect(303, session.url)
}
);

app.post('/create-setup-session', async (req, res) => {
  //console.log(currentSession);
  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    payment_method_types: [
      'card',
    ],
    customer: currentCustomer,
    success_url: `${YOUR_DOMAIN}/success-setup.html`,
    cancel_url: `${YOUR_DOMAIN}/cancel.html`,
  });

  res.redirect(303, session.url)

})

app.post('/webhook', express.json({type: 'application/json'}), (request, response) => {
  const event = request.body;

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      console.log(`Payment intent customer ${paymentIntent.customer}`)
      // Then define and call a method to handle the successful payment intent.
      // handlePaymentIntentSucceeded(paymentIntent);

      const customerID = paymentIntent.customer;
      /** Here we can assign the customer id for our example fulfillment call */
      // fullfilment.OrderBin(customerID)
      currentCustomer = customerID;
      console.log('current customer', currentCustomer)
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      // Then define and call a method to handle the successful attachment of a PaymentMethod.
      // handlePaymentMethodAttached(paymentMethod);
      break;
    case 'invoiceitem.created':
      const invoiceObj = event.data.object;
      // console.log(invoiceObj);
      break;
    case 'invoice.created':
      const invoiceCreateObj = event.data.object;
      // console.log(invoiceObj2);


      const invoiceID = invoiceCreateObj.id;
      stripe.invoices.finalizeInvoice(invoiceID, function(err, invoice) {
        // asynchronously called
      });
    break;
    case 'checkout.session.completed':

      const setupIntentObj= event;
      if (setupIntentObj.setup_intent != null) {
        console.log(setupIntentObj)
        const intent =  stripe.setupIntents.retrieve(setupIntentObj.setup_intent);
        console.log(intent);
        const paymentMethodStored =  stripe.paymentMethods.attach(
          intent,
          {customer: setupIntentObj.customer}
        );
        response.redirect(`${YOUR_DOMAIN}/success-setup.html`)
  
      }


    break;
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});

app.post('/orderBags', async (req, res) => {
  var customer = null;

  if (currentCustomer != null) {
    customer = await stripe.customers.retrieve(
      currentCustomer
    );
  }
  else {
    res.redirect(`${YOUR_DOMAIN}/failure.html`)
    return;
  }

  if (customer != null && customer.default_source == null) {
    console.log("sent invoice");
    const invoiceItem = await stripe.invoiceItems.create({
      customer: currentCustomer,
      price: 'price_1Jgw7HC24NcqpTPOKQ9ikPn9',
    });
    const invoice = await stripe.invoices.create({
      customer: currentCustomer,
      collection_method: 'send_invoice', // Auto-finalize this draft after ~1 hour
      days_until_due:'100'
    });

    stripe.invoices.sendInvoice(invoice.id, function(err, invoice) {
      // asynchronously called
    });
  }
  else {
    console.log("sent invoice");
    const invoiceItem = await stripe.invoiceItems.create({
      customer: currentCustomer,
      price: 'price_1Jgw7HC24NcqpTPOKQ9ikPn9',
    });
    const invoice = await stripe.invoices.create({
      customer: currentCustomer,
      auto_advance: true // Auto-finalize this draft after ~1 hour
    });
  }
  res.redirect(`${YOUR_DOMAIN}/success.html`)
});

app.listen(4242, () => console.log('Running on port 4242'));