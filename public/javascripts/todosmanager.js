// on load, the ui needs to display all todos
  // so the ui must have access to all todos
    // ui interactions with todos are going to be managed through the todos object
      // so todos object must have all todos prior to display
$(function() {

  let todos = {

    // todos will maintain a collection of todos as an Object of mo/yr(keys) todosArray(vals)
      // when we need todos by group, such as No Date or 10/20 (oct 2020 todos)
        // its as simple as todos returning todos["No Date"] or todos["10/20"]

  };

  let ui = {

    // registerAllPartials which will get all partials templates via $("[data-type='partial']"),
      // and go over each one saying    partialsObj[this.attr('id')] = this (or something like that)

  };

  let app = {

    // could have a property set to the name of the todo group which list should be displayed. This property could changed based on the kind of requests the ui is making.
      // on 'Add new todo' for instance, we always display the All Todos group after completion. So when we call app.addTodo, app could set this property of its, to 'all_items'.

    // if app has a method that is called after api saves a new todo, than that method needs to set the global todos variable to the new data returned by getAll, and the tell todos obj to update its todos accordingly, then, probably, tell the ui to display the list
  };

  let api = {
    path: "api/todos/",

    deleteATodo: function(id) {
      $.ajax(this.path + id, {
        method: "DELETE",
        success: function(data, status, req) {
          console.log('todo deleted');
        }
      });
    },

    retrieveAllTodos: function() {
      $.ajax(this.path, {
        method: "GET",
        dataType: "json",
        success: function(data, status, req) {
          console.log(data);
        }
      });
    },

    saveNewTodo: function(todo) {
      $.ajax(this.path, {
        method: "POST",
        data: todo,
        contentType: "application/json",
        success: function(data, status, req) {
          console.log(`${data.title} created!`);
        },
        error: function(req, errmsg, obj) {
          console.log(`errmsg: ${errmsg}`);
        }
      });
    },
  };

  api.retrieveAllTodos();
});
