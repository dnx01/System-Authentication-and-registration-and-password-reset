const express = require("express"); // Importăm modulul Express pentru gestionarea cererilor HTTP
const mongoose = require("mongoose"); // Importăm modulul Mongoose pentru interacțiunea cu baza de date MongoDB
const bodyParser = require("body-parser"); // Importăm modulul body-parser pentru a analiza corpul cererilor HTTP
const nodemailer = require("nodemailer"); // Importăm modulul nodemailer pentru trimiterea de e-mailuri
const { v4: uuidv4 } = require("uuid"); // Importăm funcția uuidv4 pentru generarea de ID-uri unice
const app = express(); // Inițializăm o aplicație Express

// Conectarea la baza de date MongoDB
mongoose
  .connect("mongodb://localhost:27017/web_app_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Conexiunea la MongoDB a fost stabilită cu succes.");
  })
  .catch((err) => {
    console.log("Eroare la conectarea la MongoDB:", err);
    process.exit();
  });

// Definim schema pentru modelul User
const UserSchema = new mongoose.Schema({
  username: String,
  prenume: String,
  dateOfBirth: String,
  email: String,
  password: String,
  userId: {
    type: String,
    default: uuidv4(), // Generare automată a unui ID unic pentru fiecare utilizator nou
  },
});

// Definim modelul User utilizând schema definită anterior
const User = mongoose.model("User", UserSchema);

// Setăm motorul de vizualizare EJS
app.set("view engine", "ejs");
// Utilizăm body-parser pentru analiza corpului cererilor HTTP
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta GET pentru afișarea paginii de înregistrare
app.get("/signup", (req, res) => {
  res.render("signup");
});

// Ruta POST pentru procesarea formularului de înregistrare
app.post("/signup", async (req, res) => {
  try {
    // Extragem datele din corpul cererii
    const { username, email, prenume, dateOfBirth, password } = req.body;
    // Verificăm dacă există deja un utilizator cu aceleași date
    const existingUser = await User.findOne({
      username,
      email,
      prenume,
      dateOfBirth,
    });

    if (existingUser) {
      return res.send(
        "Numele de utilizator, emailul și prenumele sunt deja înregistrate."
      );
    }

    // Creăm un nou utilizator utilizând datele furnizate și salvăm în baza de date
    const newUser = new User({
      username,
      email,
      prenume,
      dateOfBirth,
      password,
      userId: uuidv4(), // Generăm un nou ID unic pentru fiecare utilizator nou
    });

    await newUser.save();
    res.send("Utilizator înregistrat cu succes!");
  } catch (err) {
    res.send("Eroare la înregistrare: " + err);
  }
});

// Ruta GET pentru afișarea paginii de autentificare
app.get("/login", (req, res) => {
  res.render("login");
});

// Ruta POST pentru procesarea formularului de autentificare
app.post("/login", async (req, res) => {
  try {
    // Extragem datele din corpul cererii
    const { username, prenume, dateOfBirth, email, password } = req.body;
    // Căutăm utilizatorul în baza de date folosind datele furnizate
    const user = await User.findOne({ username, prenume, dateOfBirth, email });

    if (user && user.password === password) {
      res.send("Autentificare reusita!");
    } else {
      res.send("Nume de utilizator, prenume sau parolă incorecte.");
    }
  } catch (err) {
    res.send("Eroare la autentificare: " + err);
  }
});

// Creăm un transporter pentru serviciul de e-mail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your_adress_mail",
    pass: "password mail",
  },
});

// Ruta GET pentru afișarea paginii de resetare a parolei
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password");
});

// Ruta POST pentru procesarea formularului de resetare a parolei
app.post("/forgot-password", async (req, res) => {
  try {
    // Extragem datele din corpul cererii
    const { username, prenume, dateOfBirth, email } = req.body;
    // Căutăm utilizatorul în baza de date folosind datele furnizate
    const user = await User.findOne({ username, prenume, dateOfBirth, email });

    if (!user) {
      return res.send("Nu există un utilizator cu aceste date.");
    }

    // Generăm un identificator unic pentru resetarea parolei
    const resetId = user._id;

    // Trimitere e-mail de resetare a parolei
    const mailOptions = {
      from: "your mail",
      to: user.email,
      subject: "Resetare parolă",
      text: `Pentru a reseta parola, accesați acest link: http://localhost:3000/reset-password?id=${resetId}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.send("Eroare la trimiterea emailului de resetare a parolei.");
      } else {
        console.log("Email de resetare a parolei trimis: " + info.response);
        res.send(
          "Un email de resetare a parolei a fost trimis la adresa ta de email."
        );
      }
    });
  } catch (err) {
    res.send("Eroare la resetarea parolei: " + err);
  }
});

// Ruta GET pentru afișarea paginii de resetare a parolei
app.get("/reset-password", (req, res) => {
  const { id } = req.query; // obținem id-ul din query params
  res.render("reset-password", { id }); // transmitem id-ul către șablon
});

// Ruta POST pentru procesarea resetării parolei
app.post("/reset-password", async (req, res) => {
  try {
    const { id, password } = req.body; // Se extrag id-ul și noua parolă din corpul cererii
    // Găsirea utilizatorului în baza de date după id-ul unic
    const user = await User.findById(id);
    if (!user) { // Dacă nu există utilizatorul cu id-ul respectiv, se afișează un mesaj de eroare
      return res.send("Utilizatorul nu a fost găsit.");
    }
    // Actualizarea parolei utilizatorului cu noua parolă introdusă
    user.password = password;
    await user.save(); // Salvarea modificărilor în baza de date
    res.send("Parola a fost resetată cu succes!"); // Trimiterea unui mesaj de succes către client
  } catch (err) {
    res.send("Eroare la resetarea parolei: " + err); // Trimiterea unui mesaj de eroare către client în caz de eșec
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serverul rulează la adresa http://localhost:${PORT}/login`); // Afișarea mesajului în consolă atunci când serverul pornește
  console.log("Author: dnz");
});
