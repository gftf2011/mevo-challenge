# mevo-challenge

url do desafio: [https://github.com/brunolobo-mevo/](https://github.com/brunolobo-mevo/dGVzdGU6bWV2b2JhY2tlbmQ/blob/main/README.md)

## Instalação

Para o projeto foi utilizado Node.JS v22.19.0

### Requisitos
- Node.JS v22.19.0
- Docker
- Docker Compose

Rode o comando:
```
npm install
```

## Como rodar o projeto

Para rodar use os comandos em ordem:

```
npm run docker:up
```

```
npm run build
```

```
npm run start
```

---

## Validação dos dados - Checkpoint

- [x] Verificar se Prescricao tem duração maior que 0
- [x] Verificar se Prescricao NÃO CONTROLADA tem duração máxima de 90 dias
- [x] Verificar se Prescricao CONTROLADA tem duração máxima de 60 dias
- [x] Verificar se Prescricao CONTROLADA tem notas do médico
- [x] Verificar se Prescricao tem CÓDIGO DE UNIDADE FEDERATIVA válido
- [x] Verificar se Prescricao tem CPF de paciente válido
- [x] Verificar se Prescricao tem CRM do médico com 6 OU 7 caracteres válidos

## Validações dos fluxos - Checkpoint

- [x] Cenário de arquivos de dados válidos
- [x] Cenário de arquivos de dados inválidos
- [x] Cenário de arquivo corrompido

## Implementações

- [x] Node.JS streams
- [x] elasticsearch
- [x] Node.JS child_process

## Estimativas

### Armazenamento de dados

> Precrições

A Mevo conta com mais de `25000` farmácias e clínicas, sendo que estas tem acesso aos arquivos que seriam digitalizados !

O armazenamento do dado deve ser armazenado por no mínimo `20 anos` contando a partir da data colocada na prescrição caso faça parte do prontuário, de acordo com o Conselho Federal de Medicina (CFM), a Agência Nacional de Vigilância Sanitária (ANVISA) e o Ministério da Saúde !

Supondo que cada farmácia tenha um arquivo com as informações de `500000` de prescrições. E quandão as prescrições dos últimos `20 anos` !

Usando como base o arquivo fornecido para o teste, pode se supor que um arquivo de 200 linhas tenha em média `25KB` !

Os arquivos CSV de `500000` registros devem ter em média `625MB`

Cada farmácia submeteria (20 x 625MB) = `12,5GB`

Contando todas as `25000` farmácias parceiras da Mevo (25000 x 12,5GB) = `312,5TB`

Arredondando, seria necessário armazenar `320TB` de dados com retenção de até `20 anos` !

## Decisões Técnicas

### Utilização de Streams para leitura de dados

Como o sistema irá lidar com "arquivos grandes" será necessário ler o arquivo sob demanda para não carregar toda a informação direto na memória da aplicação !

### Processamento em batch

Como o sistema irá lidar com um grande volume de escritas e de "arquivos grandes" é necesário processar o arquivo em partes para não sobrecarregar a memória do processo.

### Utilização de "child_process"

Para permitir o processamento em background será utilizado "child_process" pra mover o processamneto do arquivo para outro processo para permitir um retorno mais rápido dos endpoints para o cliente !

### Utilização do "elasticsearch"

Para utilização do elasticsearch justificativas:

- Acesso a bulk insert, o que é prioritário dado a cenário de procesamento em batch
- Alta disponibilidade e acesso a integração com AWS OpenSearch permitindo integração com projetos nativos da AWS
- Possibilidade de reescrita de dados já existentes, dado ao cenário de falha caso o arquivo seja corrompido
- Suporte a dados nào estruturados sendo que a forma como a prescrições são armazenadas pode ter variações

## Cenários

## Fluxo de arquivo com dados válidos

Para cenários de dados válidos o endpoint `POST - api/prescription/upload` irá processar em batchs as partes do arquivo CSV em background disponibilizando as informações conforme forem processadas !

## Fluxo de arquivo com dados inválidos

Para cenários de dados inválidos o endpoint `POST - api/prescription/upload` irá processar em batchs as partes do arquivo CSV em background cada erro de validação será disponibilizado e armazenado em outro driver de dados para permitir a consulta, permitindo o processamento do batch do arquivo !

## Fluxo de arquivo corrompido

Para cenários de arquivos corrompidos será necessário o processamento em batch será interrompido para que o usuário possa fazer o download novamente do arquivo !

<br/>

## Fluxo dos endpoints

### `POST - api/prescription/upload`

Para permitir o processamento assíncrono dos dados o processamento do arquivo será feito em background, para isso será usado a parte de streams do nodejs sendo que elas são não bloqueantes. Para evitar problemas com a memória será usado um processamento em batch, então o arquivo CSV poderá ser lido em partes e processado de forma adequada sem afetar a memória !

### `GET - api/prescription/upload/:id`

Endpoint para pegar os status do upload do arquivo !

<br/>