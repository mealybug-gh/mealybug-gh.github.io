# Mobile-Candy, a mobile first fork of Candy Chat

Mobile-Candy is a minimalist, mobile first fork of the well-known XMPP client 
[Candy](http://candy-chat.github.io/candy).

## Building

### Requirements

Mobile-Candy is built using `grunt` and `bower`, which can be installed as 
node modules via `npm`.

However, the docs are generated using `naturaldocs`, which is not a node 
module but has to be installed as a binary. 

To setup the built environment for Candy, 
install [NaturalDocs](http://www.naturaldocs.org/).

Then, run `npm install` in the Mobile-Candy folder, to install dependencies
including `grunt` and `bower`.

After `npm install`, run `node_modules/bower/bin/bower install` to install 
further dependencies managed by `bower`. (If `bower` is installed globally,
your path to `bower` might be different.

### Building Mobile-Candy

Mobile-Candy is built using `grunt`, with the tasks described in the gruntfile.

To build Mobile-Candy, run `grunt build`, to build the docs, run `grunt docs`.

When running the default task, some tests may fail if their requirements are
not installed or running. You might need to set up the testing environment 
to run the tests.
