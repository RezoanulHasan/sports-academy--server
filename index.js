//for express
const express = require('express');
const app = express();
//foe data cors policy
var cors = require('cors');
//for dotenv
require ('dotenv').config();
//for   mongodb
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
//for stipe payment
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
//for email sending
const nodemailer = require("nodemailer");
//for jwt token
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;


// use   middleware
app.use(express.json());
app.use(cors());





// Send Email
const sendMail = (emailData, emailAddress) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
  })
  // verify connection configuration
  transporter.verify(function (error, success) {
    if (error) {
      console.log(error)
    } else {
      console.log('Server is ready to take our messages')
    }
  })

  const mailOptions = {
    from: process.env.EMAIL,
    to: emailAddress,
    subject: emailData?.subject,
    html:    `
    <div>
    <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
    <div className="w-12 rounded-full">
     <img src="https://i.ibb.co/NsH7xRN/Academy-Logo.png" alt="" />
    </div>
  </label>
   <h2> Dear Customer  </h2>

<h3> Congratulations! Your payment has been successfully processed, securing your spot at Sports Academy. Prepare to embark on a transformation sports journey that will unlock your full potential!</h3>

<h3> As a valued member, you now have access to our world-class facilities, expert coaching, and cutting-edge training techniques. Our team of dedicated professionals is committed to guiding you towards athletic excellence.</h3>


<h3>We are thrilled to have you join our prestigious sports community. Get ready to experience a new level of performance and accomplishment at Sports Academy!.</h3>
<br>
<h2>Sportingly yours</h2>
<h2>Rezoanul Hasan</h2>
<h4>Phone:01734639066</h4>

</h4>Sports Academy Admin.</h4>

    </div> 

    `     , 
  }


  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}
  

//(verifyJWT)
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

//  mongodb user and pass
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aatv5yk.mongodb.net/?retryWrites=true&w=majority`;


//Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {


  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

//mongodb databage
    const classCollection = client.db("SportsAcademies").collection("classes");
    const usersCollection = client.db("SportsAcademies").collection("users");
    const cartCollection = client.db("SportsAcademies").collection("carts");
    const feedbackCollection = client.db('SportsAcademies').collection('feedbacks');
    const paymentCollection = client.db("SportsAcademies").collection("payments");
    const contactCollection = client.db('SportsAcademies').collection('contacts');

    //*---------------------------using jwt--------------------------*

    app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '7d' })
        res.send({ token })
      })
  
  
       // Warning: use verifyJWT before using ( verifyAdmin)
       const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        if (user?.role !== 'admin') {
          return res.status(403).send({ error: true, message: 'forbidden message' });
        }
        next();
      }




//*--------------------------carts -------------------------*

//SHOW carts DATA   IN SERVER SITE  BY email  

   app.get('/carts', verifyJWT, async (req, res) => {
    const email = req.query.email;

    if (!email) {
      res.send([]);
    }
    const query = { email: email };
    const result = await cartCollection.find(query).toArray();
    res.send(result);
  });

// collect data client side
  app.post('/carts', async (req, res) => {
    const item = req.body;
    console.log(item);
    const result = await cartCollection.insertOne(item);
    res.send(result);
  })


//SHOW carts DATA   IN SERVER SITE  BY ID  
app.get('/carts/:id', verifyJWT,async(req, res) => {
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await cartCollection.findOne(query);
  res.send(result);
})


//delete data
  app.delete('/carts/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await cartCollection.deleteOne(query);
    res.send(result);
  })




//*--------------------------payment intent---------------------*

//show payment data 
app.get('/payments', verifyJWT, async (req, res) => {
  const email = req.query.email;

  if (!email) {
    res.send([]);
  }
  const query = { email: email };
  const result = await paymentCollection.find(query).toArray();
  res.send(result);
});
  


// create payment intent system
app.post('/create-payment-intent', verifyJWT, async (req, res) => {
  const { price } = req.body;
  const amount = parseFloat(price)* 100;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  });
  res.send({
    clientSecret: paymentIntent.client_secret
  })
})

//SHOW payments DATA   IN SERVER SITE  BY ID  
app.get('/payments/:id', verifyJWT,async(req, res) => {
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await  paymentCollection.findOne(query);
  res.send(result);
})



   //  get payments data  from client side  
   app.post('/payments', verifyJWT, async(req, res) =>{
    const payment = req.body;
    const insertResult = await paymentCollection.insertOne(payment);
    const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
     
   

  // Send confirmation email to guest
  sendMail(
    {
      subject: 'Booking Successful Courses !',
      message: `Booking Id: ${insertResult?.insertedId}, TransactionId: ${payment.transactionId}`,
    },
    payment?.email
  );


  



    //when payment complect clear bookings
    const deleteResult = await cartCollection.deleteMany(query)
    res.send({ insertResult, deleteResult });
  })




//*---------------------------feedbacks--------------------------*



//
    app.post('/feedbacks', async (req, res) => {
        const   newFeedbacks = req.body;
        console.log(newFeedbacks);
        const result = await feedbackCollection.insertOne(newFeedbacks);
        res.send(result);
    })
	


  //SHOW classes allDATA  SERVER SITE 
  app.get('/feedbacks',async (req, res) => {
   const cursor = feedbackCollection.find();
  const result = await cursor.toArray();
    res.send(result);
})

 // app.get('/feedbacks',verifyJWT, async (req, res) => {
   // const email = req.query.email;

    //if (!email) {
      //res.send([]);
    //}
    //const query = { email: email };
    //const result = await feedbackCollection.find(query).toArray();
   // res.send(result);
  //});


//SHOW feedbacks DATA   IN SERVER SITE  BY ID  
app.get('/feedbacks/:id',verifyJWT,async (req, res) => {
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await feedbackCollection.findOne(query);
  res.send(result);
})




//*---------------------------contacts--------------------------*

    //get data contacts  from  client
    app.post('/contacts', async( req, res) => {
      const contact = req.body;
      console.log(contact);
      const result = await contactCollection.insertOne(contact);
      res.send(result);
  })
  
  

  //SHOW contacts  allDATA   IN SERVER SITE 
  app.get('/contacts', async( req, res) => {
    const cursor = contactCollection.find();
        const result = await cursor.toArray();
    res.send(result);
})

//SHOW contacts  DATA   IN SERVER SITE  BY ID  
app.get('/contacts/:id', async(req, res) => {
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await contactCollection.findOne(query);
  res.send(result);


})


//*---------------------------users--------------------------*

// Get all users
app.get('/users',verifyJWT, verifyAdmin, async (req, res) => {
  const result = await usersCollection.find().toArray();
  res.send(result);
});



// Register a new user
app.post('/users', async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const existingUser = await usersCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: 'User already exists' });
  }
  const result = await usersCollection.insertOne(user);
  res.send(result);
});



// Verify if a user is an admin
//verifyJWT
app.get('/users/admin/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;
  if (req.decoded.email !== email) {
    res.send({ admin: false });
  }
// email cheak
  const query = { email: email };
  const user = await usersCollection.findOne(query);
   // check admin
  const result = { admin: user?.role === 'admin' };
  res.send(result);
});

// Promote a user to admin
app.patch('/users/admin/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: 'admin',
    },
  };

  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
});

// Verify if a user is an instructor
app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;
  if (req.decoded.email !== email) {
    res.send({ instructor: false });
  }
// email cheak
  const query = { email: email };
  const user = await usersCollection.findOne(query);
    // check instructor
  const result = { instructor: user?.role === 'instructor' };
  res.send(result);
});

// Promote a user to instructor
app.patch('/users/instructor/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: 'instructor',
    },
  };

  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
});


// Delete a user
app.delete('/users/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  res.send(result);
});


//*--------------------------classes section---------------------*


  //SHOW classes allDATA  SERVER SITE 
  //app.get('/classes', async (req, res) => {
   // const cursor =  classCollection.find();
    //const result = await cursor.toArray();
   // res.send(result);
//})



  // SHOW classes  data by login user
  app.get('/classes',  async (req, res) => {
    //console.log(req.query.email);
    let query = {};
    if (req.query?.email) {
        query = { email: req.query.email }
    }
    const result = await classCollection.find(query).toArray();
    res.send(result);
})



//SHOW classes DATA   IN SERVER SITE  BY ID  
    app.get('/classes/:id',  async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await  classCollection.findOne(query);
        res.send(result);
    })


//get classes data  from  client
    app.post('/classes', async (req, res) => {
        const   newClass = req.body;
        console.log(newClass);
        const result = await  classCollection.insertOne(newClass);
        res.send(result);
    })
	


// update class status
    app.patch('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedClasses = req.body;
      console.log(updatedClasses);
      const updateDoc = {
          $set: {
              status:  updatedClasses.status
          },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
  })



// classes UPDATE  alldata
    app.put('/classes/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = { upsert: true };
      const updateNewClass = req.body;
      const  newClass= {
          $set: {
              name: updateNewClass.name, 
              quantity: updateNewClass.quantity, 
              price: updateNewClass.price, 
              rating: updateNewClass.rating, 
              category: updateProduct.category, 
              details: updateNewClass.details, 
              photo: updateNewClass.photo
          }
      }

      const result = await classCollection.updateOne(filter, newClass, options);
      res.send(result);
  })

//classes delete  data
  app.delete('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await  classCollection.deleteOne(query);
      res.send(result);
  })



  app.get('/admin-stats', verifyJWT, verifyAdmin, async (req, res) => {
    const users = await usersCollection.estimatedDocumentCount();
    const classes = await classCollection.estimatedDocumentCount();
    const booking = await paymentCollection.estimatedDocumentCount();
    
    const payments = await paymentCollection.find().toArray();
    const revenue = payments.reduce((sum, payment) => sum + parseFloat(payment.price), 0);




    res.send({
      revenue,
      users,
      classes,
      booking,
    

    })
  })








      
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);app.get('/', (req, res) => {
    res.send('!welcome to SportsAcademies')
  })
  
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })