/**
 * Regras da data de nascimento, num lugar só.
 * O cadastro e o aviso do Início usam exatamente a mesma validação — se as
 * regras vivessem duplicadas, uma hora elas divergiriam e a aluna passaria
 * numa tela e travaria na outra.
 */

/** Idades aceitas. Fora disso é quase sempre erro de digitação no ano. */
const IDADE_MINIMA = 14;
const IDADE_MAXIMA = 100;

/** Vai formatando enquanto ela digita: 26031999 -> 26/03/1999 */
export function mascaraData(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  if (digitos.length > 4) {
    return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
  }
  if (digitos.length > 2) {
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  }
  return digitos;
}

export interface ResultadoData {
  /** Pronta para o banco (AAAA-MM-DD). Só vem preenchida quando está válida. */
  iso?: string;
  /** Mensagem para mostrar embaixo do campo. */
  erro?: string;
  /** Ainda está digitando: não vale mostrar erro em vermelho ainda. */
  incompleta: boolean;
}

export function validarData(valor: string): ResultadoData {
  const texto = valor.trim();

  if (texto === "") {
    return { erro: "Preencha sua data de nascimento.", incompleta: true };
  }

  const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) {
    return {
      erro: "Use o formato DD/MM/AAAA, tipo 26/03/2005.",
      incompleta: true,
    };
  }

  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);

  if (mes < 1 || mes > 12) {
    return { erro: "O mês precisa ser de 01 a 12.", incompleta: false };
  }
  if (dia < 1 || dia > 31) {
    return { erro: "O dia precisa ser de 01 a 31.", incompleta: false };
  }

  // Existe mesmo no calendário? Pega 31/02, 31/04 e 29/02 de ano não bissexto.
  const d = new Date(ano, mes - 1, dia);
  if (
    d.getFullYear() !== ano ||
    d.getMonth() !== mes - 1 ||
    d.getDate() !== dia
  ) {
    return {
      erro: `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")} não existe nesse ano.`,
      incompleta: false,
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (d > hoje) {
    return { erro: "A data não pode ser no futuro. 🌷", incompleta: false };
  }

  const idade = calcularIdade(d, hoje);
  if (idade < IDADE_MINIMA) {
    return { erro: "Confere o ano? Ficou muito recente.", incompleta: false };
  }
  if (idade > IDADE_MAXIMA) {
    return { erro: "Confere o ano? Ficou muito antigo.", incompleta: false };
  }

  return {
    iso: `${m[3]}-${m[2]}-${m[1]}`,
    incompleta: false,
  };
}

export function calcularIdade(nascimento: Date, referencia = new Date()): number {
  let idade = referencia.getFullYear() - nascimento.getFullYear();
  const mesDiff = referencia.getMonth() - nascimento.getMonth();
  if (mesDiff < 0 || (mesDiff === 0 && referencia.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

/** AAAA-MM-DD do banco -> DD/MM/AAAA da tela. */
export function isoParaBr(iso: string | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
