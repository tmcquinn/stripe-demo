const stripe = require('stripe')('sk_test_51JiLM8JjeRN6yJjjUh7aRGYVTYnTT0AArDQxjyD5nj2IhslRfuuvc7ipiYcSgNNTMWW3hXWQT3fcmDC8U9BFYUaJ00lt3U2ICO');
const express = require('express');
const app = express();
app.use(express.static('public'));

var currentCustomer = 'cus_KN5YupwEwdiRjx';

const YOUR_DOMAIN = 'http://localhost:4242';

app.post('/create-checkout-session', async (req, res) => {
  console.log("Starting Session");
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: 'price_1JiLMnJjeRN6yJjjFAz6CBEx',
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

app.post('/webhook', express.json({type: 'application/json'}), async (request, response) => {
  const event = request.body;

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      console.log(`Payment intent customer ${paymentIntent.customer}`)
      console.log()
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
    case 'payment_intent.created':
      const paymentIntet = event.data.object;
      console.log(paymentIntet)

      break;
    case 'checkout.session.completed':

      const setupIntentObj= event.data.object;
      if (setupIntentObj.setup_intent != null) {
        console.log(setupIntentObj)
       
        const intent = await getIntent(setupIntentObj);
        console.log(intent.payment_method);
        const paymentMethodStored = await stripe.paymentMethods.attach(
          intent.payment_method,
          {customer: setupIntentObj.customer},
        );

        console.log("finished");
        console.log(paymentMethodStored);

        const customer = await stripe.customers.update(
          currentCustomer,
          {invoice_settings: {default_source: paymentMethodStored.id}}
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

  console.log('customer', customer);
  console.log('currentCust', currentCustomer)
  if (customer != null && customer.default_source == null) {
    console.log("sent invoice");
    console.log(customer);
    const invoiceItem = await stripe.invoiceItems.create({
      customer: currentCustomer,
      price: 'price_1JiLN9JjeRN6yJjjDuDWRdK7',
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
    console.log("auto invoice");
    console.log(currentCustomer);
    const invoiceItem = await stripe.invoiceItems.create({
      customer: currentCustomer,
      price: 'price_1JiLN9JjeRN6yJjjDuDWRdK7',
    });
    const invoice = await stripe.invoices.create({
      customer: currentCustomer,
      auto_advance: true, // Auto-finalize this draft after ~1 hour
      default_source: customer.default_source
    });

    console.log(invoice);

  }

  res.redirect(`${YOUR_DOMAIN}/success.html`)
});

var getIntent = async function(setupIntentObj, paymentMethod) {
  const test = await stripe.setupIntents.retrieve(setupIntentObj.setup_intent)
  console.log(test);
  return test;
  //return google.login(data.username, data.password).then(token => { return token } )
}

app.listen(4242, () => console.log('Running on port 4242'));