// A reference to Stripe.js
var stripe;

var orderData = {
  items: [{
    id: "little-blue-truck",
    quantity: 1
  }],
  currency: "usd"
};


// The max and min number of photos a customer can purchase
var MIN_TOYS = 1;
var MAX_TOYS = 10;

document
  .getElementById('quantity-input')
  .addEventListener('change', function(evt) {
    alert('detecting a change!');
    // Ensure customers only buy between 1 and 10 photos
    if (evt.target.value < MIN_TOYS) {
      evt.target.value = MIN_TOYS;
    }
    if (evt.target.value > MAX_TOYS) {
      evt.target.value = MAX_TOYS;
    }
  });

/* Method for changing the product quantity when a customer clicks the increment / decrement buttons */
var updateQuantity = function(evt) {
  if (evt && evt.type === 'keypress' && evt.keyCode !== 13) {
    return;
  }
  var isAdding = evt && evt.target.id === 'add';
  var inputEl = document.getElementById('quantity-input');
  var currentQuantity = parseInt(inputEl.value);

  document.getElementById('add').disabled = false;
  document.getElementById('subtract').disabled = false;

  // Calculate new quantity
  var quantity = evt ?
    isAdding ?
    currentQuantity + 1 :
    currentQuantity - 1 :
    currentQuantity;

  // Update number input with new value.
  inputEl.value = quantity;
  orderData.items[0].quantity = quantity;

  // Calculate the total amount and format it with currency symbol.
  var amount = config.unitAmount;
  var numberFormat = new Intl.NumberFormat(i18next.language, {
    style: 'currency',
    currency: config.currency,
    currencyDisplay: 'symbol',
  });
  var parts = numberFormat.formatToParts(amount);
  var zeroDecimalCurrency = true;
  for (var part of parts) {
    if (part.type === 'decimal') {
      zeroDecimalCurrency = false;
    }
  }

  amount = zeroDecimalCurrency ? amount : amount / 100;
  var total = (quantity * amount).toFixed(2);
  var formattedTotal = numberFormat.format(total);

  document
    .getElementById('button-text')
    .setAttribute('i18n-options', `{ "total": "${formattedTotal}" }`);
  updateContent('button-text');

  // Disable the button if the customers hits the max or min
  if (quantity === MIN_TOYS) {
    document.getElementById('subtract').disabled = true;
  }
  if (quantity === MAX_TOYS) {
    document.getElementById('add').disabled = true;
  }

};


/* Attach method */
Array.from(document.getElementsByClassName('increment-btn')).forEach(
  (element) => {
    element.addEventListener('click', updateQuantity);
  }
);

// Disable the button until we have Stripe set up on the page
document.querySelector("button").disabled = true;

/* Get your Stripe publishable key to initialize Stripe.js */
fetch('/config')
  .then(function(result) {
    return result.json();
  })
  .then(function(json) {
    window.config = json;
    stripe = Stripe(config.publicKey);
    orderData.currency = config.currency;
    updateQuantity();
    return setupElements(json);
  })
  .then(function({
    //stripe,
    //card,
    //clientSecret
    card
  }) {
    // Setup event handler to create a Payment Intent & Confirm Payment upon Submit
    // Handle form submission.
    var form = document.getElementById("payment-form");
    form.addEventListener("submit", function(event) {
      event.preventDefault();
      //create new payment intent & confirm payment
      createPaymentIntent()
        .then(function(data) {
          //confirm paymentIntent
          pay(stripe, card, data.clientSecret);
        })
    });
  });

// Set up Stripe.js and Elements to use in checkout form
var setupElements = function(data) {
  //stripe = Stripe(data.publishableKey);
  var elements = stripe.elements();
  var style = {
    base: {
      color: "#32325d",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#aab7c4"
      }
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a"
    }
  };

  var card = elements.create("card", {
    style: style
  });
  card.mount("#card-element");

  return {
    //stripe: stripe,
    card: card,
    //clientSecret: data.clientSecret
  };
};

// Create Payment Intent based on order data and return json object with client secret
var createPaymentIntent = function() {

  return fetch('/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData)
  }).then(function(result) {
    //console.log(result.json());
    return result.json();
  });
};

/*
 * Calls stripe.confirmCardPayment which creates a pop-up modal to
 * prompt the user to enter extra authentication details without leaving your page
 */
var pay = function(stripe, card, clientSecret) {
  changeLoadingState(true);

  // Initiate the payment.
  // If authentication is required, confirmCardPayment will automatically display a modal
  stripe
    .confirmCardPayment(clientSecret, {
      payment_method: {
        card: card
      }
    })
    .then(function(result) {
      if (result.error) {
        // Show error to your customer
        showError(result.error.message);
      } else {
        // The payment has been processed!
        orderComplete(clientSecret);
      }
    });
};

/* ------- Post-payment helpers ------- */

/* Shows a success / error message when the payment is complete */
var orderComplete = function(clientSecret) {
  // Just for the purpose of the sample, show the PaymentIntent response object
  stripe.retrievePaymentIntent(clientSecret).then(function(result) {
    var paymentIntent = result.paymentIntent;
    var paymentIntentJson = JSON.stringify(paymentIntent, null, 2);

    document.querySelector(".sr-payment-form").classList.add("hidden");
    document.querySelector("pre").textContent = paymentIntentJson;

    document.querySelector(".sr-result").classList.remove("hidden");
    setTimeout(function() {
      document.querySelector(".sr-result").classList.add("expand");
    }, 200);

    changeLoadingState(false);
  });
};

var showError = function(errorMsgText) {
  changeLoadingState(false);
  var errorMsg = document.querySelector(".sr-field-error");
  errorMsg.textContent = errorMsgText;
  setTimeout(function() {
    errorMsg.textContent = "";
  }, 4000);
};

// Show a spinner on payment submission
var changeLoadingState = function(isLoading) {
  if (isLoading) {
    document.querySelector("button").disabled = true;
    document.querySelector("#spinner").classList.remove("hidden");
    document.querySelector("#button-text").classList.add("hidden");
  } else {
    document.querySelector("button").disabled = false;
    document.querySelector("#spinner").classList.add("hidden");
    document.querySelector("#button-text").classList.remove("hidden");
  }
};
