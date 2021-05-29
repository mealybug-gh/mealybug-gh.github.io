# nCrypt - Javascript cryptography made easy

**nCrypt** works as a wrapper library around mature Javascript cryptography
libraries, including

- [sjcl (1)](https://github.com/bitwiseshiftleft/sjcl)
- [elliptic](https://github.com/indutny/elliptic)
- [SparkMD5](https://github.com/satazor/SparkMD5)
- [titaniumcore (2)](http://ats.oka.nu/titaniumcore/js/crypto/readme.txt)

While **nCrypt** is not affiliated to any of these projects, it bundles these
libraries and uses them as a base trying to provide **a very convenient
Javascript cryptography API**. Of course, the original libraries stay
accessible and can be used directly when needed.

**nCrypt** offers **basic high-level cryptographic functions** -
hashing, password-based encryption, public-private-key cryptography - in simple,
slightly pre-defined ways. It is built for **web application development**.

If a **very abstract**, **intuitive** API is what you're searching
for, **nCrypt** might just be the next best choice for your project.

(1) _Slightly modified 'random.js' to keep it compatible with **nCrypt**._

(2) _Forked with minor changes for NodeJS / module compatibility._

## Building nCrypt

Building **nCrypt** requires **NodeJS** and its package manager **npm**.

### Building the library

To build `nCrypt`, run `npm install`, then `npm run build`.

### Building the docs

To build the docs, run `npm run generate-docs`.

## Using nCrypt

**nCrypt** is essentially structured in modules which depend on each other:

- **nCrypt.dep**
    * The dependencies, i.e. bundled cryptographic libraries and required tools.
- **nCrypt.init**
    * Used to initialise **nCrypt** with cryptographically random data.
- **nCrypt.tools**
    * Provides tools for simple operations on strings, arrays and JSON objects.
- **nCrypt.random**
    * Generate cryptographically random numbers, strings, and (typed) arrays.
- **nCrypt.enc**
    * Data encoding. (Byte arrays, base64, hexadecimal and so on.)
- **nCrypt.hash**
    * Simple hash functions to hash strings.
- **nCrypt.sym**
    * Symmetric encryption, i.e. encrypt data using a key or password.
- **nCrypt.asym**
    * Asymmetric encryption, i.e. public-private-key encryption.
        - **nCrypt.asym.simple**
            * The namespace you'll most likely be using.
        - **nCrypt.asym.types**
            * The lower level type classes **nCrypt.asym.simple** is based on.

### Initialising nCrypt

**nCrypt** needs to be initialised with enough cryptographically random data to
work properly. **DO NOT OMIT INITIALISING nCrypt!** Most **nCrypt**
functions are built in a way they will simply fail without enough random data,
so **nCrypt** won't work. Dependencies which still appear to be "working"
might be terribly insecure as **cryptographic security depends on enough and
random enough random data**.

( *Using SJCL from __nCrypt.dep__ without initialising is VERY insecure and
buggy as well, as the native SJCL tries to obtain some random data itself, while
the __nCrypt__ version waits for __nCrypt__ providing it with random data. This
is because __nCrypt__ lets users choose the source
of random values so any application uses what it's developer considers most
secure and finds available.* )

To initialise **nCrypt**, fill an instance of `Uint32Array` (a typed array of
unsigned `Int32` values) with random data.

**nCrypt** comes with **nCrypt.dep.randomCollector**, which abstracts random
data collection in browser and NodeJS. (Refer to the documentation of
the **ncrypt-random-collector** package for more details.)

The following snippet shows how to initialise **nCrypt** both in browser and
node, optionally preferring data collection from user input.

```
// Trust the browser RNG? Then, if a browser
// environment is found, prefer collecting random data from browser. Otherwise,
// prefer collecting random data from mouse- or touchmoves.
var trust_browser_random = true;

// Check whether there is a built-in random number generator. In NodeJS, there
// should be.
var can_collect_from_machine = nCrypt.dep.randomCollector.random.check.
                                    hasBuiltInRNG();

// Check whether random values can be collected from mouse- or touchmoves, i.e.
// if we run in a browser and there is a mouse or touchpad.
var can_collect_from_moves = nCrypt.dep.randomCollector.random.check.
                                hasMouseOrTouchSupport();

if(can_collect_from_machine===false && can_collect_from_moves===false){
    throw new Error("No source for random data available!");
}

var _random_source = nCrypt.dep.randomCollector.random.source.MACHINE;
if((trust_browser_random===false && can_collect_from_moves===true) ||
   (can_collect_from_machine===false && can_collect_from_moves===true)){
    _random_source = nCrypt.dep.randomCollector.random.source.USER;
}

var callback_random_data_collected = function(buf){
    // Called when random data has been collected.
    // @buf is an instance of Uint32Array
    // nCrypt can be initialised here.
    var ncrypt_initialised = nCrypt.init.init(buf);
    if(typeof ncrypt_initialised==='boolean'){
        if(ncrypt_initialised){
            // nCrypt is initialised. You can use it now :).
        }else{
            // Initialising has failed for some reason.
            // Check parameters, try once more if they are correct?
            // If parameters are correct and simply using more random data
            // (longer array) doesn't work, there's a bug.
        }
    }else{
        var _isExp = nCrypt.dep.SecureExec.tools.proto.inst.isException;
        if(_isExp(ncrypt_initialised)){
            // The function returned a `SecureExec.exception.Exception` object,
            // i.e. caught an exception internally.
            // Check your parameters - are they correct?
        }else{
            // Unexpected output. Bug here?
        }
    }
};
var callback_collection_progress = function(prg){
    // @prg is a value between 0 and 100, showing the progress of
    // data collection from user input in percent. Will only be called
    // if collecting data from user input (mouse-/ touchmoves).
    // As collecting takes some time, show users a progress bar etc.
};

// Generate 4096 bit of random data to be sure there's enough to initialise
// **nCrypt**. 4096 bit of random data are equal to 4096/8=512 byte, with an
// Int32 representing 4 byte of data.
var tmp_ab = new Uint32Array(((4096/8)/4));

nCrypt.dep.randomCollector.random.collect(
    _random_source,
    tmp_ab,
    callback_random_data_collected,
    callback_collection_progress
);

```

Obtaining the random data the way shown above is recommended as it abstracts the
different APIs providing random data in browsers and NodeJS, and allows
preferring random data from user input as well.

### Using nCrypt securely

**nCrypt** tries to be **easy to use**. However, this doesn't mean it can ensure
security on it's own.

#### Knowning nCrypt's limitations

First, **_consider nCrypt PRE-ALPHA software. DO NOT USE IT if your or anyone else security,
wellbeing, money or whatever depends on it._**

Ask yourself what happens if all the data is decrypted by an attacker. **If the
price is high if your cryptographic application fails, please DO NOT USE EARLY
ALPHA SOFTWARE like nCrypt.** Prefer more mature cryptographic systems such as mail
encryption using PGP.

#### Knowning nCrypt's advantages

The idea behind **nCrypt** is **rapidly building cryptography enabled
web apps**.

Compared to lower level APIs, **nCrypt** abstracts cryptographic
functions and common problems when working with Javascript crypto as much as
possible.

- **Intuitive API**. Direct access to functions like "build a keyset for
  public-private-key cryptography", "encrypt a string using a password" etc.
- **Serialized output**. Most functions output strings and simple JSON objects.
  If you build a keyset, you can simply store the private key on the users
  machine and send the public key over the network. No hassle with
  serialization of complicated objects.
- **Convenient exception handling**. Exceptions happen, and especially with
  asynchronous function calls, can be hard to catch. To avoid exceptions breaking
  your app, **nCrypt** uses **SecureExec** to catch exceptions internally. If an
  exception occurs, **nCrypt** usually doesn't break program execution, but the
  function simply outputs an instance of
  `SecureExec.exception.Exception`, a custom exception object which contains
  information about the exception, including a stacktrace. Uncaught exceptions
  should happen far less often. (I.e. they happen only if something's really
  broken - for example `nCrypt` wasn't initialised.)
- **Type handling**. A lot of Javascript cryptography bugs happen due to passing
  an array where a string would have been expected, a string for an integer
  number and similar things which tend to happen with a weakly typed language.
  While **nCrypt** _cannot avoid this completely_, a lot of type checking is
  done internally to make sure a function's arguments are valid.

Give users more trust in your application by securely encrypting their data.

#### Can **nCrypt** be used to replace SSL?

**No**, **nCrypt** cannot replace SSL. Of course, if you use NodeJS on your server,
**nCrypt** can run both server and client side, allowing for some kind of
"private channel" between server and client.
But there's a weak link: The **nCrypt** script has to be sent to the
user, as well as all other parts of your application. If this happens over a
non-secure connection, it results in the **nCrypt** file
_not necessarily received unmodified_ by a user. _That's really insecure!_

Instead, **use nCrypt and SSL/HTTPS _combined_**. Make sure you have
HTTPS-enabled hosting and send a non-spoofed **nCrypt** file to users
so it can be used for actual privacy enhancement.

If HTTPS hosting is not affordable or available to you, consider an app or
browser addon approach instead. Free HTTPS hosting can often be found if a
subdomain is acceptable for you, which might be the case for a small personal
project.

#### Know what you're doing

**nCrypt** can provide functions for symmetric and asymmetric encryption. It can
check the arguments passed to functions. But it **cannot check your protocol**
or **make up for weak passwords**.

For example, if you don't know what public-private-key cryptography is, i.e.
how to deal with public and private keys etc., the **nCrypt.asym** namespace
isn't for you.

Before implementing something, be sure you know what you are implementing.

- What **kind of data** needs to be encrypted?
- Which **kind of cryptography** do you need? (Symmetric? Asymmetric? Both?)
- What is the **protocol**, how is data sent over the network or stored? Are
  there any moments where you accidentally "tell" an attacker the key etc.?
- **Scriptkiddies** are real. Do you validate any data received / decrypted to
  check whether it for example tries to inject a script?

Before implementing an application using **nCrypt**, abstractly construct your
protocol, and research what you don't know yet.

To learn more about applying encryption (approaching it at a very abstract
level), actively use other cryptographic
applications and APIs to get a better understanding how they work. (For example,
mail and file encryption / PGP on the command line, the OpenSSL command line,
the BouncyCastle API etc. Use cryptography in everyday life, i.e. encrypt mails,
find out about different ways to encrypt files and so on.)

When using public-private-key cryptography, note some risks which always remain.

- Private keys are always encrypted with a symmetric key. If a private key is used
  multiple times, the user needs to know this symmetric key (i.e. a strong password).
  In this case, make sure users understand the security of their key depends
  on the strength of their password.
- Do not send (encrypted) private keys over the network / store them online if
  possible. If it really is necessary for your type of application, the password is
  even more important.
- Know what the **Man in the Middle Attack** (MITM) is. There's no 100% secure
  prevention, but know it well enough to decide which kind of prevention is best
  for your application.

And always **read the docs**! You can only use functions properly if you know
what they are doing, what input they require and what output they produce.

## What does nCrypt provide?

**nCrypt** provides an **intuitive Javascript cryptography API**. This includes
data **encoding**, data **hashing**, generating **random data**, **symmetric
encryption** (i.e. encrypt some data using a key), and **asymmetric
encryption** (public-private-key cryptography).

With **hashing** and **symmetric encryption**, **nCrypt** aims at offering a lot
of common algorithms, so it's up to you which you choose the safest. With
symmetric encryption, for example, there's *AES*, *Twofish*, *Serpent* and
classic *Rijndael*. If you are unsure which algorithm to choose, *Twofish*
or *AES* are pretty performant choices most of the time, however, all of the
algorithms are working.

With **asymmetric encryption**, **nCrypt** at the moment exclusively uses **ECC**.
You might notice a lot of (not all) applications providing public-private-key
cryptography use **RSA**. But, even if applied asynchronously, generating long RSA
keys in (browser) Javascript is impractically slow. As much as **nCrypt** would like
to be compatible to mature asymmetric cryptography protocols using RSA, it
needs stay compatible to everyday use as well.

This is why **nCrypt** uses **ECC** ( _Elliptic Curve Cryptography_ ). With
ECC, much smaller keys are required than with RSA. A 256 bit ECC key equals
about the strenght of a 3072 bit RSA key. This is why **SSL** and **Bitcoin**
have been using it for years, with **Bitcoin** using ECC exclusively for
public-private-key operations. An increasing number of applications use ECC as of today.

What might appear strange to you if generating public-private-key cryptography
keysets using **nCrypt** for the first time is you give a **curvename** as a
parameter instead of a key strength (bit length).

This is because ECC keys in fact are **points on elliptic curves**. An elliptic
curve is defined by parameters. The parameters of curves commonly used for
cryptographic purposes are summarized in **named standards**, for
example "curve25519". The parameters for example define key strength (in case
of "curve25519", 256 bit) and the mathematical details how the keys are calculated.

( *An elliptic curve is a graph / function. A keypair in ECC results when a
known base point on the curve is  multiplicated with a large random number. The
resulting point is the public key, while the large random number is the private key.
It's fast to calculate the multiplication, but it takes years to eternity (depending on key
size / curve parameters) to derive the secret random number from the resulting
point.* )

There's always a discussion going on which curves are secure as security doesn't
depend on bit strength of the resulting keys only. There are curve parameters
which allow "math tricks" to retrieve the secret key faster than expected. For
some curves, such "tricks" were found after a while.

To check which curves are currently considered secure, visit
[safecurves.cr.yp.to](http://safecurves.cr.yp.to/) for example. **nCrypt**
offers some curves which are not listed as "safe", so choose the right ones for
your application. At the point of writing this, Montgomery and Edwards type
curves (for example, "curve25519" and "ed25519") are considered rather secure.
Montgomery curves can be used for encryption only, so use Edwards type curves
for signing. But do your own research: This document might be outdated when you
read it.

Be sure to use curves providing adequate key strength.

#### Why keysets, not keypairs?

With public-private-key cryptography, encrypting messages is possible just as
signing them.

When using ECC, it is **more secure to use different keypairs for encryption
and signing**. To avoid the hassle of dealing with two seperate
keypairs, **nCrypt** bundles two keypairs in a `keyset`. A keyset can be a
signing-only, encryption-only or signing and encryption enabled keyset,
depending on what you pass to the generating function.

Dealing with abstract keysets simply is much easier than handling two
keypairs in most cases.

## License

**nCrypt** is released under the [MIT License](http://opensource.org/licenses/MIT).

## Legal notice

 _This page **links third party websites**, which again contain links to third
party websites. The authors of this page **have not reviewed all the third party
links content**, and are **not responsible for the content of any third party
website**._

 _Links to third-party websites are provided as potentially interesting for
visitors, but **do not imply and kind of affiliation**. The authors of this
website **accept no liability for any third party content linked**, and are
not responsible for the accuracy or legality of third party content._

Please note this page is **not regularly maintained**. If you find any kind of
copyright violation or other legal problem, please leave a notice. Once the
notice is found, the authors of this page will of course try to fix the issue
as soon as possible. However, there's no warranty it will be found fast or will
be found at all. _You might read this page when the project is under active
development, on hold, or abandoned. Please consider that._
