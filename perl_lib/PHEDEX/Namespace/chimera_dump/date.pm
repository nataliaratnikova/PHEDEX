package PHEDEX::Namespace::chimera_dump::date;
# Implements the 'date' function for dump access
use strict;
use warnings;
use Time::Local;
use File::Basename;
use XML::Parser;
use XML::Simple;
use Time::Local;
use PHEDEX::Core::Catalogue ( qw / lfn2pfn / );

# @fields defines the actual set of attributes to be returned
our @fields = qw / access uid gid size mtime /; 
sub new
{
  my ($proto,$h) = @_;
  my $class = ref($proto) || $proto;
# This shows the use of an external command to stat the file. It would be
# possible to do this with Perl inbuilt 'stat' function, of course, but this
# is just an example.
  my $self = {
	       cmd	=> 'ls',
	       opts	=> ['-l'],
             };
  bless($self, $class);
  $self->{ENV} = $h->{ENV} || '';
  map { $self->{MAP}{$_}++ } @fields;
  return $self;
}


sub execute
{
# 'execute' will use the common 'Command' function to do the work, but on the
# base directory, not on the file itself. This lets it cache the results for
# an entire directory instead of having to go back to the SE for every file 
  my ($self,$ns,$file,$tfc) = @_;
  my $nfiles = 0;
  my $call   = 'date';
  my $pfn = $tfc->lfn2pfn($file,$ns->Protocol());

  return $ns->Command($call,$pfn) if $ns->{NOCACHE};

  my $dir = dirname $pfn;
  if ( $ns->{INPUT_FILE} ) {
    if ( -r $ns->{INPUT_FILE} ) { $nfiles = $self->parse_chimera_dump($ns,$pfn); 
                                  if ( $nfiles < 1 ) {
                                     print "dump: chimera dump file $ns->{INPUT_FILE} does not have information about $pfn, accessing system\n";
                                     $ns->Command($call,$dir); 
                                  }
                                }
    else { die "Input dump file $ns->{INPUT_FILE} is not accesible\n"; }
  } else {
    $ns->Command($call,$dir);  
  }

# Explicitly pull the right value from the cache
  return $ns->{CACHE}->fetch($call,$pfn);
}

sub parse
{
# Parse the stat output. Assumes the %A:%u:%g:%s:%Y format was used. Returns
# a hashref with all the fields parsed. Note that the format of the command
# and the order of the fields in @fields are tightly coupled.
  my ($self,$ns,$r,$dir) = @_;

  my $result;
# return an empty hashref instead of undef if nothing is found, so it can
# still be dereferenced safely.
  $r = {} unless defined $r;
  foreach ( @{$r->{STDOUT}} )
  {
    my ($x,$file,@t,%h,$M,$d,$y_or_hm,$y,$h,$m);
    chomp;
    m%^(\S+)\s+\d+\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$%
        or next;
    $x->{access} = $1;
    $x->{uid} = getpwnam($2);
    $x->{gid} = getgrnam($3);
    $x->{size} = $4;

    %h = ( Jan => 0, Feb => 1, Mar => 2, Apr => 3, May =>  4, Jun =>  5,
           Jul => 6, Aug => 7, Sep => 8, Oct => 9, Nov => 10, Dec => 11 );
    $M = $h{$5};
    $d = $6;
    $y_or_hm = $7;
    $file = $8;
    if ( $y_or_hm =~ m%(\d+):(\d+)% ) { $h = $1; $m = $2; }
    else                              { $y = $y_or_hm; }
    @t = ( 0, $m, $h, $d, $M, $y );
    $x->{mtime} = timelocal(@t);
    $ns->{CACHE}->store('date',"$dir/$file",$x);
    $result = $x;
  }
  return $result;
}

sub parse_chimera_dump
{
  my ($self,$ns,$testfile) = @_;

  my $dir       = dirname $testfile;
  my $result    = 0;
  my $file_dump = $ns -> {INPUT_FILE};

  if ( $file_dump =~ m%.gz$% )
     { open DUMP, "cat $file_dump | gzip -d - | grep $dir |" or die "Could not open: $file_dump\n"; }
  else
     { open(DUMP, "grep $dir $file_dump |") or die  "Could not open: $file_dump\n"; }

 my ($x,$file,$time);
 my $xml= new XML::Simple;
 my $data = $xml->XMLin($file_dump);
 $file = $testfile;
 $x->{timeFromXml} = $self->convertToUnixTime($data->{'dump'}->{'recorded'}); 
 if ($file_dump =~ m%^\D+(\d+)\D+$% ) {
    $time = $1;
    $time =~ s/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/$1-$2-$3T$4:$5:00Z/g;
 }
 $x->{timeFromName} = $self->convertToUnixTime($time);
 $ns->{CACHE}->store('date',"$file",$x);
 if ( $file eq $testfile ) { $result++; }
 return $result;
}

sub convertToUnixTime 
{
  my ($self,$time) = @_;
  my ($unixTime, $d, $t, @d, @t);
  if ($time =~ m%(\S+)T(\S+)Z%) 
  {
    $d = $1;
    @d = split /-/, $1;
    $t = $2;
    @t = split /:/, $2;
  }
  $unixTime = timelocal($t[2], $t[1], $t[0], $d[2], $d[1], $d[0]);
  return $unixTime;
}

sub Help
{
  print 'Return (',join(',',@fields),")\n";
}

1;
