<<<<<<< HEAD
const emailData = {
  order_id: "12345",
  customer_name: "John Doe",
  customer_phone: "+254700000000",
  customer_email: "customer@example.com",
  delivery_notes: "Leave it at the gate if I am not around.", // Optional: wrapped in {{#delivery_notes}} block
  email: "customer@example.com", // For the footer tag
  orders: [
    {
      name: "Manchester United Home Jersey 25/26",
      units: 1,
      price: "1,300",
      image_url: "https://your-store.com/images/manu.jpg"
    },
    {
      name: "Bayern Munich Away Jersey 25/26",
      units: 1,
      price: "1,800",
      image_url: "https://your-store.com/images/bayern.jpg"
    }
  ],
  cost: {
    shipping: "250",
    tax: "0",
    total: "3,350"
  }
};

module.exports = { emailData };

=======
const emailData = {
  order_id: "12345",
  customer_name: "John Doe",
  customer_phone: "+254700000000",
  customer_email: "customer@example.com",
  delivery_notes: "Leave it at the gate if I am not around.", // Optional: wrapped in {{#delivery_notes}} block
  email: "customer@example.com", // For the footer tag
  orders: [
    {
      name: "Manchester United Home Jersey 25/26",
      units: 1,
      price: "1,300",
      image_url: "https://your-store.com/images/manu.jpg"
    },
    {
      name: "Bayern Munich Away Jersey 25/26",
      units: 1,
      price: "1,800",
      image_url: "https://your-store.com/images/bayern.jpg"
    }
  ],
  cost: {
    shipping: "250",
    tax: "0",
    total: "3,350"
  }
};

module.exports = { emailData };

>>>>>>> f17c75c (Add website files and netlify config)
