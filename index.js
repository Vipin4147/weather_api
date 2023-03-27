const connection = require("../weather api/config/db.js");

const express = require("express");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const { createClient } = require("redis");

const { UserModel } = require("./model/user_model.js");

const { authenticate } = require("./middleware/authenticate.js");

const app = express();

app.use(express.json());

require("dotenv").config();

const myredis = createClient({
  url: "redis://default:u2Pl4XkTWzqr9N1XkOUzsKZ0qnsAxqwf@redis-14012.c264.ap-south-1-1.ec2.cloud.redislabs.com:14012",
});

myredis.on("error", (err) => console.log("Redis Client Error", err));

app.get("/", authenticate, (req, res) => {
  res.send("welcome user");
});

app.get("/weather", authenticate, async (req, res) => {
  const city = req.query.city;

  let data = await fetch(
    `api.weatherstack.com/current?access_key=${
      (process.env, API_KEY)
    }&query=${city}`
  );

  await data.json();

  res.send(data);
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  const already_exists = await UserModel.find({ email });
  if (already_exists.length > 0) {
    res.send("User already exists");
  } else {
    const hashed_pass = bcrypt.hash(password, 8, async (err, result) => {
      if (err) {
        res.send("registration failed");
      }
      const user = await new UserModel({ name, email, password: result });
      user.save();
      res.send("user registered successfully");
    });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await UserModel.find({ email });

  const match = await bcrypt.compare(password, user[0].password);

  if (match) {
    const token = jwt.sign({ email }, process.env.JWT, { expiresIn: "1h" });
    const ref_token = jwt.sign({ email }, process.env.REF_JWT, {
      expiresIn: "5h",
    });

    res.send({ msg: "login successful", token, ref_token });
  } else {
    res.send("Wrong Credentials");
  }
});

app.get("/logout", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    res.send("Please login first");
  } else {
    await myredis.connect();
    await myredis.set("token", token);
    // const red_token = await myredis.get("token");
    // console.log("redis_token", red_token);
    await myredis.disconnect();
    res.send("logout successful");
  }
});

app.listen(7500, async () => {
  await connection;
  console.log("connected to db");

  console.log("running at 7500");
});
