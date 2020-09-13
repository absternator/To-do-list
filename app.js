//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash");
const Quote = require("inspirational-quotes");
const https = require("https");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// create mongodb database - on cloud Amazon server(MongodB atlas)
mongoose.connect(
  "mongodb+srv://absternator:raag141991@cluster0.dy4cu.mongodb.net/todolistDB",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
// create schema for items
const itemsScehma = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Needs a name"],
  },
});
// creates "item(s)" collection
const Item = mongoose.model("Item", itemsScehma);
// create Default items
const item1 = new Item({
  name: "Welcome to your todo List",
});
// insert items
const defaultArray = [item1];
// List schema
const listSchema = mongoose.Schema({
  name: String,
  items: [itemsScehma],
});
// add type of list schema
const List = mongoose.model("List", listSchema);
// Get todays date
const day = date.getDate();
// create weather schema
const weatherScehma = mongoose.Schema({
  city: {
    type: String,
    required: [true, "NEED A CITY"],
  },
  description: String,
  temprature: Number,
  imgUrl: String,
});
const Weather = mongoose.model("Weather", weatherScehma);

app.get("/", function (req, res) {
  // Check if city initialzied
  Weather.find({}, (err, foundWeather) => {
    if (foundWeather.length === 0) {
      res.render("weather", { quote: Quote.getQuote() });
    } else {
      const city = foundWeather[0].city;
      const temp = foundWeather[0].temprature;
      const description = foundWeather[0].description;
      const imgUrl = foundWeather[0].imgUrl;
      Item.find({}, (err, foundItems) => {
        // Add default at the beggening only
        if (foundItems.length === 0) {
          Item.insertMany(defaultArray, (err) => {
            if (err) {
              console.log(err);
            } else {
              console.log("Deafult items inserted");
            }
          });
          res.redirect("/");
        } else {
          res.render("list", {
            listTitle: day,
            newListItems: foundItems,
            quote: Quote.getQuote(),
            temp: temp,
            description: description,
            imgUrl: imgUrl,
            city: city,
          });
        }
      });
    }
  });
  
});

app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  const item = new Item({
    name: itemName,
  });
  if (listName === day) {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName }, (err, foundList) => {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});
app.post("/delete", (req, res) => {
  const checkedBoxID = req.body.checkbox;
  const listName = req.body.listName;

  if (listName == day) {
    Item.findByIdAndDelete(checkedBoxID, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("succesfully removed");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkedBoxID } } },
      (err, foundList) => {
        if (!err) {
          res.redirect("/" + listName);
        }
      }
    );
  }
  // remove the checked item
});
app.post("/weather", (req, res) => {
  const city = req.body.city;
  const appid = "45fe6714fe3048e1e20cd3048a90ff82";
  const units = "metric";
  const url =
    "https://api.openweathermap.org/data/2.5/weather?q=" +
    city +
    "&appid=" +
    appid +
    "&units=" +
    units;
  // get weather
  https.get(url, function (response) {
    console.log(response.statusCode);
    response.on("data", (data) => {
      const weatherData = JSON.parse(data);
      const cityWeather = new Weather({
        city: city,
        description: weatherData.weather[0].description,
        temprature: weatherData.main.temp,
        imgUrl:
          "http://openweathermap.org/img/wn/" +
          weatherData.weather[0].icon +
          "@2x.png",
      });
      cityWeather.save();
    });
    setTimeout(function () {
      res.redirect("/");
    }, 500);
  });
});
// add differnt types of lists to different pages
app.get("/:customListName", (req, res) => {
  const customListName = _.capitalize(req.params.customListName);
  Weather.find({}, (err, foundWeather) => {
    if (foundWeather.length === 0) {
      res.render("weather", { quote: Quote.getQuote() });
    } else {
      const city = foundWeather[0].city;
      const temp = foundWeather[0].temprature;
      const description = foundWeather[0].description;
      const imgUrl = foundWeather[0].imgUrl;

      List.findOne({ name: customListName }, (err, foundList) => {
        if (!err) {
          // if foundlist ===null --> (!foundlist)
          if (!foundList) {
            // create new List
            const list = new List({
              name: customListName,
              items: defaultArray,
            });
            list.save();
            res.redirect("/" + customListName);
          } else {
            // show exisitng list
            res.render("list", {
              listTitle: foundList.name,
              newListItems: foundList.items,
              quote: Quote.getQuote(),
              temp: temp,
              description: description,
              imgUrl: imgUrl,
              city: city,
            });
          }
        } else {
          console.log(err);
        }
      });
    }
  });
});

app.get("/about", function (req, res) {
  res.render("about");
});
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started Successfully");
});
