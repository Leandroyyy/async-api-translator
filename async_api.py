import json
import os

import yaml
from flask import Flask, jsonify, request, send_file

app = Flask(__name__)
PORT = 3000

# Carrega o conteúdo do arquivo YAML
with open("./asyncapi.yaml", "r", encoding="utf-8") as file:
    asyncAPI = yaml.safe_load(file)

# Função para resolver referências $ref manualmente
def resolve_references(obj, root):
    if isinstance(obj, dict):
        if "$ref" in obj:
            ref_path = obj["$ref"].lstrip("#/").split("/")
            ref_value = root
            for part in ref_path:
                ref_value = ref_value.get(part)
            return resolve_references(ref_value, root)  # Resolve a referência de forma recursiva
        else:
            return {key: resolve_references(value, root) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [resolve_references(item, root) for item in obj]
    else:
        return obj

# Resolver todas as referências $ref no documento AsyncAPI
dereferencedAPI = resolve_references(asyncAPI, asyncAPI)

@app.route("/", methods=["GET"])
def serve_file():
    try:
        # Gera o HTML temporário
        file_path = os.path.join(os.getcwd(), "generated.html")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html(dereferencedAPI))

        # Envia o arquivo como download
        return send_file(file_path, as_attachment=True, download_name="generated.html")

    except Exception as e:
        print(f"Erro ao gerar e enviar o arquivo: {e}")
        return "Erro ao fazer download do arquivo", 500
    finally:
        # Exclui o arquivo temporário
        if os.path.exists(file_path):
            os.remove(file_path)

# Rota para fornecer os dados do AsyncAPI com referências resolvidas
@app.route("/api/asyncapi", methods=["GET"])
def get_asyncapi():
    try:
        # Exibe os dados do payload resolvido
        print("teste===", convert_payload_to_type(
            dereferencedAPI['channels']['appointment-scheduled']['messages']['agendado']['payload']
        ))

        # Retorna os dados resolvidos como JSON
        return jsonify(dereferencedAPI)

    except Exception as e:
        print(f"Erro ao processar o documento AsyncAPI: {e}")
        return "Erro ao processar o documento AsyncAPI", 500

# Função para converter o payload em tipos
def convert_payload_to_type(payload):
    payload_constructed = {}
    for key, value in payload['properties'].items():
        payload_constructed[key] = value['type']
    return payload_constructed

# Geração de HTML dinâmico com template
def html(template):
    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/mode/javascript/javascript.min.js"></script>
        <title>AsyncAPI Viewer</title>
        <style>
          body {{ font-family: Arial, sans-serif; margin: 20px; }}
          h1 {{ color: #333; }}
          .title-container {{ display: flex; gap: 10px; align-items: center; }}
          .title-container img {{ width: 100px; }}
          .info, .channels {{ margin-bottom: 20px; }}
          #json-editor {{ height: 500px; width: 100%; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; }}
        </style>
      </head>
      <body>
        <div class="title-container">
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2d/2023_Ita%C3%BA_Unibanco_Logo.png" alt="Logo" />
          <h1>Informações da API</h1>
        </div>
        <div class="info">
          <p><strong>Título:</strong> {template['info']['title']}</p>
          <p><strong>Versão:</strong> {template['info']['version']}</p>
          <p><strong>Descrição:</strong> {template['info']['description']}</p>
        </div>
        <h2>Canais</h2>
        <div class="channels"></div>
        <textarea id="json-editor"></textarea>
        <script>
          const editor = CodeMirror.fromTextArea(document.getElementById('json-editor'), {{
            mode: "application/json",
            theme: "default",
            lineNumbers: true,
            readOnly: true
          }});
          const jsonParsed = `{json.dumps(convert_payload_to_type(template['channels']['appointment-scheduled']['messages']['agendado']['payload']), indent=2)}`;
          editor.setValue(jsonParsed);
        </script>
      </body>
    </html>
    """

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
