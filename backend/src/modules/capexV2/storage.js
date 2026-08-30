const fs = require('fs/promises');
const path = require('path');
const { randomUUID, createHash } = require('crypto');

class LocalDocumentStorage {
  constructor(root = process.env.CAPEX_V2_DOCUMENT_ROOT || path.join(process.cwd(), 'storage', 'capex-v2')) {
    this.root = path.resolve(root);
    this.providerName = 'LOCAL';
  }

  async put(buffer) {
    const key = `${randomUUID()}.bin`;
    const target = path.resolve(this.root, key);
    if (!target.startsWith(`${this.root}${path.sep}`)) throw new Error('Invalid document storage key');
    await fs.mkdir(this.root, { recursive: true });
    await fs.writeFile(target, buffer);
    return {
      provider: this.providerName,
      key,
      byteSize: buffer.length,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    };
  }

  async read(key) {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(`${this.root}${path.sep}`)) throw new Error('Invalid document storage key');
    return fs.readFile(target);
  }

  async delete(key) {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(`${this.root}${path.sep}`)) throw new Error('Invalid document storage key');
    await fs.unlink(target).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

module.exports = { LocalDocumentStorage };
