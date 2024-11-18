const express = require("express");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");
const $RefParser = require("json-schema-ref-parser");

const app = express();
const PORT = 3000;

const fileContents = fs.readFileSync("./asyncapi.yaml", "utf8");
const asyncAPI = yaml.load(fileContents);

app.get("/", async (req, res) => {
  //res.sendFile(path.join(__dirname, "index.html"));

  const dereferencedAPI = await $RefParser.dereference(asyncAPI);

  // Salva o HTML em um arquivo temporário
  const filePath = path.join(__dirname, "generated.html");
  fs.writeFileSync(filePath, html(dereferencedAPI), "utf8");

  // Envia o arquivo como download
  res.download(filePath, "generated.html", (err) => {
    if (err) {
      console.error("Erro ao fazer download do arquivo:", err);
      res.status(500).send("Erro ao fazer download do arquivo");
    } else {
      // Exclui o arquivo temporário após o download
      fs.unlinkSync(filePath);
    }
  });
});

// Rota para fornecer os dados do AsyncAPI com referências resolvidas
app.get("/api/asyncapi", async (req, res) => {
  try {
    // Leia o arquivo AsyncAPI (YAML)
    const fileContents = fs.readFileSync("./asyncapi.yaml", "utf8");
    const asyncAPI = yaml.load(fileContents);

    // Resolve as referências $ref no documento AsyncAPI
    const dereferencedAPI = await $RefParser.dereference(asyncAPI);

    // Envie os dados desreferenciados como JSON para o frontend

    console.log(
      "teste===",
      convertPayloadToType(
        dereferencedAPI.channels["appointment-scheduled"].messages.agendado
          .payload
      )
    );

    res.json(dereferencedAPI);
  } catch (e) {
    console.error("Erro ao processar o documento AsyncAPI:", e);
    res.status(500).send("Erro ao processar o documento AsyncAPI");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

function convertPayloadToType(payload) {
  let payloadConstructed = {};

  for (const [key, value] of Object.entries(payload.properties)) {
    payloadConstructed = {
      ...payloadConstructed,
      [key]: value.type,
    };
  }

  return payloadConstructed;
}


const html = (template) => `
  <!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.css"
    />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/mode/javascript/javascript.min.js"></script>

    <title>AsyncAPI Viewer</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 20px;
      }
      h1 {
        color: #333;
      }

      .title-container {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .title-container img {
        width: 100px;
      }

      .info,
      .channels {
        margin-bottom: 20px;
      }

      #json-editor {
        height: 500px;
        width: 100%;
        font-size: 14px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <div class="title-container">
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/2/2d/2023_Ita%C3%BA_Unibanco_Logo.png"
        alt=""
      />
      <h1>Informações da API</h1>
    </div>  
    <div class="info">
      <p><strong>Título: ${
        template.info.title
      }</strong> <span id="title"></span></p>
      <p><strong>Versão: ${
        template.info.version
      }</strong> <span id="version"></span></p>
      <p><strong>Descrição: ${
        template.info.description
      }</strong> <span id="description"></span></p>
    </div>

    <h2>Canais</h2>
    <div class="channels" id="channels"></div>

    <textarea id="json-editor"></textarea>
      
    <script>
      const editor = CodeMirror.fromTextArea(
        document.getElementById("json-editor"),
        {
          mode: "application/json",
          theme: "default",
          lineNumbers: true,
          readOnly: true,
        }
      );

      const jsonParsed =  \`${JSON.stringify(
        convertPayloadToType(
          template.channels["appointment-scheduled"].messages.agendado.payload
        ),
        null,
        2
      )}\`;

       // JSON exemplo
      const jsonExample = JSON.stringify(jsonParsed, null, 2); 

      editor.setValue(jsonParsed);
    </script>

    
  </body>
</html>

`;
