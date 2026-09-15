const image = document.querySelector(".track-image");
const race = document.querySelector("#raceExperience");
const lights = [...document.querySelectorAll(".light")];
const status = document.querySelector("#status");
const launchButton = document.querySelector("#launchButton");
const falseStartPanel = document.querySelector("#falseStartPanel");
const resultScreen = document.querySelector("#resultScreen");
const narrativeScreen = document.querySelector("#narrativeScreen");
const quizScreen = document.querySelector("#quizScreen");
const resultTime = document.querySelector("#resultTime");
const audioToggle = document.querySelector("#audioToggle");
const questionNumber = document.querySelector("#questionNumber");
const questionKicker = document.querySelector("#questionKicker");
const quizQuestion = document.querySelector("#quizQuestion");
const quizOptions = document.querySelector("#quizOptions");
const quizQuestionWrap = document.querySelector("#quizQuestionWrap");
const progressBar = document.querySelector("#progressBar");
const teamResultScreen = document.querySelector("#teamResultScreen");
const teamResultName = document.querySelector("#teamResultName");
const teamResultDescription = document.querySelector("#teamResultDescription");
const downloadTeamResult = document.querySelector("#downloadTeamResult");
const shareResultButton = document.querySelector("#shareResultButton");
const SHARE_URL = "https://quizteencontronopodio.vercel.app/";

// Coordenadas das lentes na arte de 1024 × 1536: não dependem do viewport.
const MOBILE_ARTWORK = {
  width: 1024,
  height: 1536,
  lampCenters: [
    [336, 493],
    [436, 493],
    [536, 493],
    [635, 493],
    [735, 493],
  ],
  lampDiameter: 54,
};
const DESKTOP_ARTWORK = {
  width: 1672,
  height: 941,
  lampCenters: [
    [642, 172],
    [738, 172],
    [834, 172],
    [930, 172],
    [1027, 172],
  ],
  lampDiameter: 56,
};

const RaceState = Object.freeze({
  IDLE: "idle",
  COUNTDOWN: "countdown",
  WAITING: "waiting",
  READY: "ready",
  FALSE_START: "false-start",
  FINISHED: "finished",
});

class RaceTimer {
  start() {
    this.startTime = performance.now();
  }

  stop() {
    return (performance.now() - this.startTime) / 1000;
  }
}

class AudioController {
  constructor() {
    this.enabled = false;
    this.volume = 0.36;
    this.track = new Audio("assets/audio/race-start.mp3");
    this.track.preload = "metadata";
    this.track.volume = this.volume;
    this.fadeFrame = null;
  }
  async toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.fadeOut(180);
    return this.enabled;
  }
  async unlock() {
    if (!this.enabled) return;
    try {
      this.track.muted = true;
      await this.track.play();
      this.track.pause();
      this.track.currentTime = 0;
      this.track.muted = false;
    } catch (_) {}
  }
  startRace() {
    if (!this.enabled) return;
    cancelAnimationFrame(this.fadeFrame);
    this.track.pause();
    this.track.currentTime = 0;
    this.track.volume = this.volume;
    this.track.play().catch(() => {});
  }
  fadeOut(duration = 550) {
    cancelAnimationFrame(this.fadeFrame);
    const initialVolume = this.track.volume;
    const startedAt = performance.now();
    const fade = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      this.track.volume = initialVolume * (1 - progress);
      if (progress < 1) this.fadeFrame = requestAnimationFrame(fade);
      else {
        this.track.pause();
        this.track.currentTime = 0;
        this.track.volume = this.volume;
      }
    };
    this.fadeFrame = requestAnimationFrame(fade);
  }
}

class ShareCard {
  constructor(trackImage) {
    this.trackImage = trackImage;
  }

  async createBlob(time) {
    await document.fonts?.ready;

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;

    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 1080, 1920);

    gradient.addColorStop(0, "#06234b");
    gradient.addColorStop(0.48, "#087bea");
    gradient.addColorStop(1, "#021126");

    context.fillStyle = gradient;
    context.fillRect(0, 0, 1080, 1920);

    if (this.trackImage.complete && this.trackImage.naturalWidth) {
      context.save();
      context.globalAlpha = 0.22;

      const scale = Math.max(
        1080 / this.trackImage.naturalWidth,
        820 / this.trackImage.naturalHeight,
      );

      const width = this.trackImage.naturalWidth * scale;
      const height = this.trackImage.naturalHeight * scale;

      context.drawImage(
        this.trackImage,
        (1080 - width) / 2,
        1030 - (height - 820) / 2,
        width,
        height,
      );

      context.restore();
    }

    context.textAlign = "center";
    context.fillStyle = "#80d4ff";
    context.font = '28px "Formula 1 Display", sans-serif';
    context.fillText("TE ENCONTRO NO PÓDIO", 540, 212);

    context.fillStyle = "#fff";
    context.font = '78px "Formula 1 Display", sans-serif';
    context.fillText("MINHA LARGADA", 540, 495);

    context.font = '190px "Formula 1 Display", sans-serif';
    context.fillText(`${time.toFixed(3)}s`, 540, 710);

    context.fillStyle = "#c9eeff";
    context.font = '40px "Formula 1 Display", sans-serif';
    context.fillText(`Minha largada foi em ${time.toFixed(3)}s`, 540, 805);

    context.fillStyle = "#fff";
    context.font = '36px "Formula 1 Display", sans-serif';
    context.fillText("PILOTO", 540, 1710);

    context.fillStyle = "#8cd5ff";
    context.font = '25px "Formula 1 Display", sans-serif';
    context.fillText("PRONTO PARA A CORRIDA. TE ENCONTRO NO PÓDIO!", 540, 1760);

    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  async download(time) {
    const blob = await this.createBlob(time);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "te-encontro-no-podio.png";
    link.click();

    URL.revokeObjectURL(url);
  }
}

class TeamQuiz {
  constructor() {
    this.index = 0;
    this.scores = { storm: 0, ferzan: 0 };
    this.questions = [
      {
        question: "Diante de um problema, você…",
        options: [
          ["Enfrenta.", "storm"],
          ["Planeja.", "ferzan"],
          ["Arrisca.", "storm"],
          ["Calcula.", "ferzan"],
        ],
      },
      {
        question: "Escolha o seu GP.",
        options: [
          ["Monza", "ferzan"],
          ["Mônaco", "ferzan"],
          ["São Paulo", "storm"],
          ["Silverstone", "storm"],
        ],
      },
      {
        question: "No amor, você prefere…",
        options: [
          ["Intensidade.", "storm"],
          ["Segurança.", "ferzan"],
          ["Aventura.", "storm"],
          ["Estabilidade.", "ferzan"],
        ],
      },
      {
        question: "Como você faz seu macarrão?",
        options: [
          ["Quebra e joga na panela", "storm"],
          ["Ajeita delicadamente e espera", "ferzan"],
          ["Miojo conta como macarrão, né?", "storm"],
          ["Massa fresca", "ferzan"],
        ],
      },
      {
        question: "Quando duvidam de você…",
        options: [
          ["Provo que consigo.", "storm"],
          ["Sigo em silêncio.", "ferzan"],
          ["Uso como combustível.", "storm"],
          ["Foco no objetivo.", "ferzan"],
        ],
      },
      {
        question: "Escolha seu companheiro de equipe perfeito.",
        options: [
          ["Irmãos de outra mãe", "storm"],
          ["Rivalidade alta", "ferzan"],
          ["Melhor do que amigos, BFF", "storm"],
          ["Só deixo passar se for pela brita", "ferzan"],
        ],
      },
      {
        question: "Seu maior defeito seria…",
        options: [
          ["Impulsividade.", "storm"],
          ["Orgulho.", "ferzan"],
          ["Teimosia.", "storm"],
          ["Controle.", "ferzan"],
        ],
      },
    ];
  }

  start() {
    this.index = 0;
    this.scores = { storm: 0, ferzan: 0 };

    quizScreen.hidden = false;
    teamLoading.hidden = true;
    teamResultScreen.hidden = true;
    teamResultScreen.classList.remove("show-download");

    this.render();
  }

  render() {
    const current = this.questions[this.index];
    const position = String(this.index + 1).padStart(2, "0");
    const total = String(this.questions.length).padStart(2, "0");

    questionNumber.textContent = `${position} / ${total}`;
    questionKicker.textContent = `PERGUNTA ${position}`;
    progressBar.style.width = `${((this.index + 1) / this.questions.length) * 100}%`;
    quizQuestion.textContent = current.question;

    quizOptions.replaceChildren(
      ...current.options.map(([label, team], optionIndex) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "quiz-option";
        button.innerHTML = `
          <span class="quiz-option-letter">${String.fromCharCode(65 + optionIndex)}</span>
          <span>${label}</span>
        `;

        button.addEventListener("click", () => {
          this.answer(team, button);
        });

        return button;
      }),
    );
  }

  answer(team, button) {
    if (quizOptions.dataset.locked === "true") return;

    quizOptions.dataset.locked = "true";
    button.classList.add("selected");
    this.scores[team] += 1;

    window.setTimeout(() => {
      this.index += 1;
      quizOptions.dataset.locked = "";

      if (this.index === this.questions.length) {
        this.reveal();
        return;
      }

      quizQuestionWrap.classList.add("is-changing");

      window.setTimeout(() => {
        this.render();
        quizQuestionWrap.classList.remove("is-changing");
      }, 130);
    }, 430);
  }

  reveal() {
    const team = this.scores.storm > this.scores.ferzan ? "storm" : "ferzan";

    const content =
      team === "storm"
        ? [
            "SCUDERIA STORM",
            "Você corre com precisão, coragem tranquila e a força de quem transforma cada escolha em destino.",
          ]
        : [
            "FERZAN RACING",
            "Você é movido por intensidade, instinto e pela coragem de acelerar quando todos preferem frear.",
          ];

    quizScreen.hidden = true;
    teamResultScreen.hidden = true;
    teamLoading.hidden = false;

    window.setTimeout(() => {
      teamLoading.hidden = true;
      teamResultName.textContent = content[0];
      teamResultDescription.textContent = content[1];

      teamResultScreen.className = `team-result-screen ${team}`;
      teamResultScreen.dataset.resultImage =
        `assets/${team === "storm" ? "storm-result.png" : "ferzan-result.png"}`;

      teamResultScreen.hidden = false;

      window.setTimeout(
        () => teamResultScreen.classList.add("show-download"),
        150,
      );
    }, 2000);
  }
}

class RaceController {
  constructor({ timer, audio, onResult }) {
    this.timer = timer;
    this.audio = audio;
    this.onResult = onResult;
    this.state = RaceState.IDLE;
    this.timeouts = [];
    this.updateLaunchButton();
  }

  updateLaunchButton() {
    if (!launchButton) return;

    const canPress =
      this.state === RaceState.COUNTDOWN ||
      this.state === RaceState.WAITING ||
      this.state === RaceState.READY;

    launchButton.disabled = !canPress;
    launchButton.hidden = this.state === RaceState.FINISHED;
    launchButton.setAttribute("aria-disabled", String(!canPress));
  }

  setState(state) {
    this.state = state;
    this.updateLaunchButton();

    race.classList.toggle(
      "is-countdown",
      state === RaceState.COUNTDOWN || state === RaceState.WAITING,
    );
    race.classList.toggle("lights-out", state === RaceState.READY);
    race.classList.toggle("is-error", state === RaceState.FALSE_START);
  }
  schedule(callback, delay) {
    const id = window.setTimeout(callback, delay);
    this.timeouts.push(id);
    return id;
  }
  clearSchedule() {
    this.timeouts.forEach(clearTimeout);
    this.timeouts = [];
  }
  beginCountdown() {
    if (this.state !== RaceState.IDLE) return;
    this.setState(RaceState.COUNTDOWN);
    status.textContent = "Mantenha o foco. Espere as luzes apagarem.";
    const interval = 760;
    this.audio.startRace();
    lights.forEach((light, index) =>
      this.schedule(
        () => {
          light.classList.add("active");
          if (index === lights.length - 1) {
            this.setState(RaceState.WAITING);
            status.textContent = "Todas as luzes acesas. Aguarde.";
            this.schedule(() => this.lightsOut(), 1200 + Math.random() * 2400);
          }
        },
        240 + index * interval,
      ),
    );
  }
  lightsOut() {
    if (this.state !== RaceState.WAITING) return;

    lights.forEach((light) => light.classList.remove("active"));

    // O cronômetro começa exatamente após as luzes apagarem.
    this.timer.start();

    this.setState(RaceState.READY);
    status.textContent = "ACELERE!";
  }
  handlePress() {
    this.audio.unlock();

    if (
      this.state === RaceState.COUNTDOWN ||
      this.state === RaceState.WAITING
    ) {
      this.falseStart();
      return;
    }

    if (this.state === RaceState.READY) {
      this.finish();
    }
  }
  falseStart() {
    this.clearSchedule();
    this.setState(RaceState.FALSE_START);
    lights.forEach((light) => light.classList.remove("active"));
    this.audio.fadeOut();
    status.textContent = "🚨 FALSA LARGADA";
    falseStartPanel.hidden = false;
  }
  finish() {
    const time = this.timer.stop();
    this.setState(RaceState.FINISHED);
    this.audio.fadeOut();
    status.textContent = "Classificação concluída.";
    this.onResult(time);
  }
  reset() {
    this.clearSchedule();
    lights.forEach((light) => light.classList.remove("active"));
    falseStartPanel.hidden = true;
    launchButton.hidden = false;
    race.classList.remove("is-result");
    this.setState(RaceState.IDLE);
    status.textContent = "De volta ao grid. Prepare-se.";
    this.schedule(() => this.beginCountdown(), 900);
  }
}

function alignLights() {
  const artwork = image.currentSrc.includes("cockpit-storm-desktop")
    ? DESKTOP_ARTWORK
    : MOBILE_ARTWORK;
  const { width, height, lampCenters, lampDiameter } = artwork;
  const viewWidth = image.clientWidth;
  const viewHeight = image.clientHeight;
  const scale = Math.max(viewWidth / width, viewHeight / height);
  const offsetX = (viewWidth - width * scale) / 2;
  const offsetY = (viewHeight - height * scale) / 2;
  lights.forEach((light, index) => {
    const [x, y] = lampCenters[index];
    light.style.left = `${offsetX + x * scale}px`;
    light.style.top = `${offsetY + y * scale}px`;
    light.style.setProperty("--light-size", `${lampDiameter * scale}px`);
  });
}

const audio = new AudioController();
const shareCard = new ShareCard(image);
const quiz = new TeamQuiz();
let latestTime = 0;
const raceController = new RaceController({
  timer: new RaceTimer(),
  audio,
  onResult(time) {
    latestTime = time;
    resultTime.textContent = `${time.toFixed(3)}s`;
    resultScreen.hidden = false;
    race.classList.add("is-result");
  },
});

audioToggle.addEventListener("click", async () => {
  const enabled = await audio.toggle();
  if (enabled) {
    await audio.unlock();
    if (
      raceController.state === RaceState.COUNTDOWN ||
      raceController.state === RaceState.WAITING
    )
      audio.startRace();
  }
  audioToggle.textContent = `Som: ${enabled ? "ligado" : "desligado"}`;
  audioToggle.setAttribute("aria-pressed", String(enabled));
});
document
  .querySelector("#restartButton")
  .addEventListener("click", () => raceController.reset());
document
  .querySelector("#saveResultButton")
  .addEventListener("click", () => shareCard.download(latestTime));
document.querySelector("#continueButton").addEventListener("click", () => {
  audio.fadeOut();
  resultScreen.hidden = true;
  race.classList.add("is-quiz");
  narrativeScreen.hidden = false;
});
document.querySelector("#openQuizButton").addEventListener("click", () => {
  narrativeScreen.hidden = true;
  quiz.start();
});

document.querySelector("#restartQuizButton").addEventListener("click", () => {
  teamLoading.hidden = true;
  teamResultScreen.hidden = true;
  teamResultScreen.classList.remove("show-download");
  quiz.start();
});

downloadTeamResult?.addEventListener("click", async () => {
  const source = teamResultScreen.dataset.resultImage;
  if (!source) return;

  const button = downloadTeamResult;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "PREPARANDO...";

  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error("Não foi possível carregar a imagem.");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = source.split("/").pop() || "resultado-equipe.png";
    document.body.append(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    // Fallback para celulares que não permitem download direto.
    window.open(source, "_blank", "noopener,noreferrer");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});

shareResultButton?.addEventListener("click", async () => {
  const team = teamResultScreen.classList.contains("storm")
    ? "Scuderia Storm"
    : "Ferzan Racing";

  const message = `🏁 Eu participei da experiência Te Encontro no Pódio!

Meu tempo de reação foi: ${latestTime.toFixed(3)}s

E descobri que faço parte da equipe ${team}.

Será que você consegue superar minha largada?

🏎️ Faça o quiz:
${SHARE_URL}`;

  shareResultButton.disabled = true;
  shareResultButton.textContent = "PREPARANDO...";

  try {
    const raceBlob = await shareCard.createBlob(latestTime);
    const teamPath = teamResultScreen.dataset.resultImage;
    const teamResponse = await fetch(teamPath);
    const teamBlob = await teamResponse.blob();

    const files = [
      new File([raceBlob], "minha-largada.png", { type: "image/png" }),
      new File([teamBlob], "minha-equipe.png", {
        type: teamBlob.type || "image/png",
      }),
    ];

    if (
      navigator.share &&
      (!navigator.canShare || navigator.canShare({ files }))
    ) {
      await navigator.share({
        title: "Te Encontro no Pódio",
        text: message,
        files,
      });
    } else {
      await navigator.clipboard?.writeText(message);
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  } finally {
    shareResultButton.disabled = false;
    shareResultButton.textContent = "📲 COMPARTILHAR MEU RESULTADO";
  }
});

image.addEventListener("load", alignLights);
window.addEventListener("resize", alignLights);
if (image.complete) alignLights();
window.setTimeout(() => raceController.beginCountdown(), 1300);
launchButton?.addEventListener("click", () => {
  launchButton.hidden = true;
  raceController.handlePress();
});
