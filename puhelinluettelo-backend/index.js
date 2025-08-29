const http = require('http');
const { parse } = require('querystring');
const url = require('url');

var morgan = require('morgan');

let persons = [
  { id: 1, name: 'Arto Hellas', number: '040-123456' },
  { id: 2, name: 'Ada Lovelace', number: '39-44-5323523' },
  { id: 3, name: 'Dan Abramov', number: '12-43-234345' },
  { id: 4, name: 'Mary Poppendieck', number: '39-23-6423122' },
];

const renderHomePage = (result = '') => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Puhelinluettelo</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .person { border: 1px solid #ccc; margin: 10px 0; padding: 10px; }
          .delete-btn { background: red; color: white; border: none; padding: 5px 10px; cursor: pointer; }
          .delete-btn:hover { background: darkred; }
        </style>
      </head>
      <body>
        <h1>Puhelinluettelo</h1>
        <p>Henkilot JSON-muodossa: <a href="/api/persons">Siirry</a></p>
        <p>Info-sivulle: <a href="/info">Siirry</a></p>
        <h2>Hae henkilon tiedot ID:lla</h2>
        <form method="POST" action="/search">
          <input type="number" name="id" required />
          <button type="submit">Hae</button>
        </form>
        <h2>Lisaa uusi henkilo</h2>
        <form id="add-person-form">
          <div style="margin-bottom: 10px;">
            <label>Nimi: <input type="text" id="name" required /></label>
          </div>
          <div style="margin-bottom: 10px;">
            <label>Numero: <input type="text" id="number" required /></label>
          </div>
          <button type="submit">Lisaa</button>
        </form>
        <div style="margin-top: 1em;">${result}</div>
        <script>
          document.getElementById('add-person-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const number = document.getElementById('number').value;
            
            try {
              const response = await fetch('/api/persons', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, number })
              });
              
              if (response.ok) {
                alert('Henkilo lisatty onnistuneesti!');
                location.reload();
              } else {
                const errorData = await response.json();
                alert('Virhe: ' + errorData.virhe);
              }
            } catch (error) {
              alert('Virhe: ' + error.message);
            }
          });
          
          async function deletePerson(id) {
            if (confirm('Haluatko varmasti poistaa henkilon ID:lla ' + id + '?')) {
              try {
                const response = await fetch('/api/persons/' + id, {
                  method: 'DELETE'
                });
                if (response.ok) {
                  alert('Henkilo poistettu onnistuneesti!');
                  location.reload();
                } else {
                  alert('Virhe poistettaessa henkiloa');
                }
              } catch (error) {
                alert('Virhe: ' + error.message);
              }
            }
          }
        </script>
      </body>
    </html>
  `;
};

// Create server
const app = http.createServer((request, response) => {
  // --- Add CORS headers for all responses ---
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // --- Handle preflight requests ---
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  // --- Morgan setup ---
  morgan.token('body', (req) =>
    req._bodyData ? JSON.stringify(req._bodyData) : ''
  );
  morgan(':method :url :status :res[content-length] - :response-time ms :body')(
    request,
    response,
    () => {}
  );

  // --- Routing ---
  if (request.method === 'GET' && request.url === '/') {
    const html = renderHomePage();
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(html);
  } else if (request.method === 'POST' && request.url === '/search') {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      const data = parse(body);
      const id = parseInt(data.id);
      const person = persons.find((p) => p.id === id);

      let resultHtml = '';
      if (person) {
        resultHtml = `
          <div style="border: 2px solid #4CAF50; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <p>Loytyi: <strong>${person.name}</strong>, numero: ${person.number} (ID: ${person.id})</p>
            <button class="delete-btn" onclick="deletePerson(${person.id})">Poista tama henkilo</button>
          </div>
        `;
      } else {
        resultHtml = `<p style="color:red;">Virhe: Henkiloa ID:lla ${id} ei loytynyt.</p>`;
      }

      const html = renderHomePage(resultHtml);
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(html);
    });
  } else if (request.url === '/api/persons' && request.method === 'GET') {
    const json = JSON.stringify(persons, null, 2);
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Henkilot</title></head>
        <body>
          <pre>${json}</pre>
          <p>Takaisin etusivulle: <a href="/">Siirry</a></p>
        </body>
      </html>
    `;
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(html);
  } else if (request.url === '/info') {
    const count = persons.length;
    const date = new Date();
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Info</title></head>
        <body>
          <h1>Info</h1>
          <p>Puhelinluettelossa on ${count} henkilon tiedot</p>
          <p>${date}</p>
          <p>Takaisin etusivulle: <a href="/">Siirry</a></p>
        </body>
      </html>
    `;
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(html);
  } else if (
    request.method === 'DELETE' &&
    request.url.startsWith('/api/persons/')
  ) {
    const urlParts = request.url.split('/');
    const id = parseInt(urlParts[3]);
    const personIndex = persons.findIndex((p) => p.id === id);

    if (personIndex !== -1) {
      persons.splice(personIndex, 1);
      response.writeHead(204);
      response.end();
    } else {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ virhe: 'Henkiloa ei loytynyt' }));
    }
  } else if (request.method === 'POST' && request.url === '/api/persons') {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      try {
        const uusiHenkilo = JSON.parse(body);

        // Store body for Morgan logging
        request._bodyData = uusiHenkilo;

        if (!uusiHenkilo.name) {
          response.writeHead(400, { 'Content-Type': 'application/json' });
          return response.end(JSON.stringify({ virhe: 'nimi puuttuu' }));
        }

        if (!uusiHenkilo.number) {
          response.writeHead(400, { 'Content-Type': 'application/json' });
          return response.end(JSON.stringify({ virhe: 'numero puuttuu' }));
        }

        if (persons.find((p) => p.name === uusiHenkilo.name)) {
          response.writeHead(400, { 'Content-Type': 'application/json' });
          return response.end(
            JSON.stringify({ virhe: 'nimi on jo luettelossa' })
          );
        }

        if (persons.find((p) => p.number === uusiHenkilo.number)) {
          response.writeHead(400, { 'Content-Type': 'application/json' });
          return response.end(
            JSON.stringify({ virhe: 'numero on jo luettelossa' })
          );
        }

        const luoId = () => {
          let id;
          do {
            id = Math.floor(Math.random() * 1e9);
          } while (persons.some((p) => p.id === id));
          return id;
        };

        const lisattavaHenkilo = {
          id: luoId(),
          name: uusiHenkilo.name,
          number: uusiHenkilo.number,
        };
        persons.push(lisattavaHenkilo);

        response.writeHead(201, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(lisattavaHenkilo));
      } catch (error) {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ virhe: 'Virheellinen JSON' }));
      }
    });
  } else {
    response.writeHead(404);
    response.end('Not found');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
