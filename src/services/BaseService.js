/**
 * Base service class with common CRUD operations
 * All services should extend this class
 */
class BaseService {
  constructor(model) {
    if (!model || !model.modelName) {
      throw new Error('A valid Mongoose model is required');
    }
    this.model = model;
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @private
   */
  _validateId(id) {
    if (!id) {
      throw new Error('ID is required');
    }
    if (typeof id !== 'string' && !id._id) {
      throw new Error('ID must be a string or MongoDB ObjectId');
    }
  }

  /**
   * Validate data object
   * @param {Object} data
   * @private
   */
  _validateData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Data must be a non-null object');
    }
  }

  /**
   * Find document by ID
   * @param {string} id - MongoDB ObjectId
   * @param {Object} options - Query options (populate, select, etc.)
   * @returns {Promise<Object|null>}
   */
  async findById(id, options = {}) {
    this._validateId(id);
    try {
      let query = this.model.findById(id);

      if (options.populate) {
        query = query.populate(options.populate);
      }

      if (options.select) {
        query = query.select(options.select);
      }

      return await query.exec();
    } catch (error) {
      // Preserve original error for proper handling
      error.context = 'BaseService.findById';
      throw error;
    }
  }

  /**
   * Find all documents with optional filters
   * @param {Object} filter - MongoDB filter object
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAll(filter = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sort = { createdAt: -1 },
        populate = null,
        select = null
      } = options;

      let query = this.model.find(filter);

      if (populate) {
        query = query.populate(populate);
      }

      if (select) {
        query = query.select(select);
      }

      query = query
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

      return await query.exec();
    } catch (error) {
      // Preserve original error for proper handling
      error.context = 'BaseService.findAll';
      throw error;
    }
  }

  /**
   * Create new document
   * @param {Object} data - Document data
   * @returns {Promise<Object>}
   */
  async create(data) {
    this._validateData(data);
    try {
      return await this.model.create(data);
    } catch (error) {
      // Preserve original error for proper handling
      error.context = 'BaseService.create';
      throw error;
    }
  }

  /**
   * Update document by ID
   * @param {string} id - MongoDB ObjectId
   * @param {Object} updates - Update data
   * @returns {Promise<Object|null>}
   */
  async update(id, updates) {
    this._validateId(id);
    this._validateData(updates);
    try {
      return await this.model.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );
    } catch (error) {
      // Preserve original error for proper handling
      error.context = 'BaseService.update';
      throw error;
    }
  }

  /**
   * Delete document by ID
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<Object|null>}
   */
  async delete(id) {
    this._validateId(id);
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (error) {
      // Preserve original error for proper handling
      error.context = 'BaseService.delete';
      throw error;
    }
  }

  /**
   * Count documents matching filter
   * @param {Object} filter - MongoDB filter object
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      // Preserve original error for proper handling
      error.context = 'BaseService.count';
      throw error;
    }
  }

  /**
   * Check if document exists
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    const doc = await this.model.findById(id).select('_id').lean();
    return !!doc;
  }
}

module.exports = BaseService;
