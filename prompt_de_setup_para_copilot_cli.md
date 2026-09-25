# Instruções de Setup - PDV Amor dr Shake

Você é um assistente de desenvolvimento. Siga os passos abaixo rigorosamente para inicializar o projeto React para o sistema de Ponto de Venda (PDV) da loja "Amor dr Shake".

## 1. Criação do Projeto Base
Execute o comando abaixo para criar um novo projeto usando Vite com o template de React e TypeScript. 
**Atenção:** Se você já estiver dentro de uma pasta vazia dedicada ao projeto, substitua `amor-dr-shake-pdv` por `.` no comando `npm create`.

```bash
npm create vite@latest amor-dr-shake-pdv -- --template react-ts
```

Navegue para a pasta gerada (se aplicável):
```bash
cd amor-dr-shake-pdv
```

## 2. Instalação das Dependências
Instale as dependências regulares (Supabase, Zustand para estado, React Router para navegação e Lucide para ícones):
```bash
npm install @supabase/supabase-js zustand react-router-dom lucide-react
```

Instale as dependências de desenvolvimento (Tailwind CSS e suas ferramentas):
```bash
npm install -D tailwindcss postcss autoprefixer
```

## 3. Configuração do Tailwind CSS
Inicialize o Tailwind criando os arquivos `tailwind.config.js` e `postcss.config.js`:
```bash
npx tailwindcss init -p
```

Modifique o arquivo `tailwind.config.js` gerado para incluir os caminhos do React:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Substitua o conteúdo do arquivo `src/index.css` pelas diretivas do Tailwind:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Estilos globais básicos para o app do tablet */
body {
  background-color: #f3f4f6; /* gray-100 */
}
```

## 4. Estrutura de Diretórios
Crie a seguinte estrutura de pastas dentro de `src/`:
- `src/components/` (Para componentes reutilizáveis, modais e botões)
- `src/pages/` (Para as telas principais: POS, Dashboard, Products)
- `src/store/` (Para a configuração do Zustand)
- `src/lib/` (Para o cliente do Supabase e funções utilitárias)
- `src/types/` (Para as interfaces do TypeScript)

## 5. Limpeza Inicial
- Remova o arquivo `src/App.css`.
- Limpe o arquivo `src/App.tsx` para deixar apenas um componente funcional básico retornando uma `<div className="p-4 text-2xl font-bold">PDV Amor dr Shake</div>`.