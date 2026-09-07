// Wspólny skaner modułów dla PZ i WZ.
// Wymaga: html5-qrcode oraz common.js.

class ModuleScanner {
  constructor(options) {
    this.readerId = options.readerId;
    this.getItems = options.getItems;
    this.onAdded = options.onAdded;
    this.onDuplicate = options.onDuplicate;
    this.onError = options.onError;
    this.onStateChange = options.onStateChange;

    this.mode = "single";
    this.qr = null;
    this.running = false;
    this.handlingResult = false;
  }

  setMode(mode) {
    this.mode = mode === "serial" ? "serial" : "single";
  }

  getMode() {
    return this.mode;
  }

  async start() {
    if (this.running) return;

    this.running = true;
    this.handlingResult = false;
    this.qr = new Html5Qrcode(this.readerId);
    this._notifyState();

    try {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error("Nie wykryto kamery.");
      }

      const camera = this._pickBackCamera(cameras);

      await this.qr.start(
        camera.id,
        { fps: 10, qrbox: 250 },
        decodedText => this._handleDecoded(decodedText),
        () => {}
      );
    } catch (error) {
      this.running = false;
      this.handlingResult = false;
      this.qr = null;
      this._notifyState();

      if (typeof this.onError === "function") {
        this.onError(error);
      }
    }
  }

  async stop() {
    if (!this.qr) {
      this.running = false;
      this.handlingResult = false;
      this._notifyState();
      return;
    }

    const qr = this.qr;
    this.qr = null;

    try {
      if (this.running) {
        await qr.stop();
      }
    } catch (_) {
      // Kamera mogła zostać zatrzymana przez przeglądarkę.
    }

    try {
      qr.clear();
    } catch (_) {}

    this.running = false;
    this.handlingResult = false;
    this._notifyState();
  }

  async _handleDecoded(decodedText) {
    if (this.handlingResult) return;

    const value = cleanSN(decodedText);
    if (!value) return;

    this.handlingResult = true;

    const items = typeof this.getItems === "function" ? this.getItems() : [];
    const duplicate = hasDuplicateSN(items, value);

    if (duplicate) {
      if (this.mode === "single") {
        await this.stop();
      }

      if (typeof this.onDuplicate === "function") {
        await this.onDuplicate(value);
      }

      if (this.mode === "serial" && this.running) {
        window.setTimeout(() => {
          this.handlingResult = false;
        }, 700);
      }

      return;
    }

    if (typeof this.onAdded === "function") {
      await this.onAdded(value);
    }

    if (this.mode === "single") {
      await this.stop();
      return;
    }

    window.setTimeout(() => {
      this.handlingResult = false;
    }, 700);
  }

  _pickBackCamera(cameras) {
    const backWords = ["back", "rear", "environment", "tyl", "arrière", "trasera"];

    const found = cameras.find(camera => {
      const label = String(camera.label || "").toLowerCase();
      return backWords.some(word => label.includes(word));
    });

    // W telefonach tylna kamera bardzo często jest ostatnia na liście.
    return found || cameras[cameras.length - 1] || cameras[0];
  }

  _notifyState() {
    if (typeof this.onStateChange === "function") {
      this.onStateChange({
        running: this.running,
        mode: this.mode
      });
    }
  }
}

window.ModuleScanner = ModuleScanner;
