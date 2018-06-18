/**
 * The `Tree` class contains a directory tree and associated
 * default files in a CFS FHS implementation.
 */
class Tree {
  /**
   * Expose `Tree` class as static getter
   * @public
   * @accessor
   * @type {Tree}
   */
  static get Tree() { return Tree }

  constructor() {
    /**
     * An array of partitioned file systems.
     * @public
     * @const
     * @type {Array<String>}
     */
    this.partitions = []

    /**
     * An array of the default directory structure for a CFS.
     * This directory tree defines a subset of the Filesystem Hierarchy Standard.
     * Directories in the file system tree are intended to have similar use to
     * their "Unix" equivalent.
     * @public
     * @const
     * @type {Array<String>}
     */
    this.directories = []

    /**
     * An array of default files that are managed by a CFS file system. They
     * are recreated, if deleted, and are typically reserved for internal usage.
     * @public
     * @const
     * @type {Array<String>}
     */
    this.files = []

    // FHS partitions
    this.partitions.push('/etc')
    this.partitions.push('/lib')
    this.partitions.push('/tmp')
    this.partitions.push('/var')
    this.partitions.push('/home')

    // FHS partition directories
    this.directories.push('/var/log')
    this.directories.push('/var/cache')

    // CFS files
    this.files.push('/etc/cfs-id')
    this.files.push('/etc/cfs-epoch')
    this.files.push('/etc/cfs-signature')
    this.files.push('/var/log/events')

    // lock this tree down!
    Object.seal(Object.freeze(this.partitions))
    Object.seal(Object.freeze(this.directories))
    Object.seal(Object.freeze(this.files))
    Object.seal(Object.freeze(this))
  }
}

module.exports = new Tree()
