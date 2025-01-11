const Base = require('./base');

// This is not really talking to the KitchenOwl API, but talking to a HomeAssistant instance
// that has the KitchenOwl integration installed and has the 'todo.shopping_list' entity enabled.
class KitchenOwl extends Base {
  /**
   * Constructor.
   */
  constructor() {
    super();
  }

  /**
   * Get items.
   *
   * @returns {Array<Object>}
   */
  async list() {
    const res = await this.post(
      this.api_url,
      'services/todo/get_items?return_response=null',
      {"entity_id": "todo.shopping_list"},
      this.headers
    );

    return res.service_response["todo.shopping_list"]["items"]
      .filter(item => item.status != "completed")
      .map(item => {
        return {
          name: item.summary,
          id: item.id
        };
      });
  }

  /**
   * Create item.
   *
   * @param {string} name
   */
  async create(name) {
    await this.post(this.api_url, 'services/todo/add_item', { "item": name, "entity_id": "todo.shopping_list" }, this.headers);
  }

  /**
   * Clear list.
   */
  async clear() {
    await this.post(
      this.api_url,
      'services/todo/remove_completed_items',
      {"entity_id": "todo.shopping_list"},
      this.headers
    );
  }
}

module.exports = KitchenOwl;
